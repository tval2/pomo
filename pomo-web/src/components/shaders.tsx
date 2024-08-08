const GAUSSIAN_KERNEL = `
const int KERNEL_SIZE = 15;
const float GAUSSIAN_KERNEL[KERNEL_SIZE] = float[](
  0.0345378632877979,
  0.0447931940270943,
  0.05581575676584786,
  0.0668235931358567,
  0.07686542832967164,
  0.08494943599538109,
  0.0902024157483115,
  0.09202462542007796,
  0.0902024157483115,
  0.08494943599538109,
  0.07686542832967164,
  0.0668235931358567,
  0.05581575676584786,
  0.0447931940270943,
  0.0345378632877979
);`

// Pass 1
const colorAndHorizontalBlurVertexShaderSrc = `#version 300 es
out vec2 uv;

void main(void) {
  const vec2 QUAD[4] = vec2[](
    vec2(-1.0, 1.0), vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );
  vec2 pos = QUAD[gl_VertexID];
  gl_Position = vec4(pos, 0.0, 1.0);
  uv = 0.5 * (pos + 1.0);

  // Flip x
  uv.x = 1.0 - uv.x;
}`;

const colorAndHorizontalBlurFragmentShaderSrc = `#version 300 es
precision highp float;

uniform sampler2D sampler0;
uniform float time;
uniform float dt;
uniform vec2 clickPos;

in vec2 uv;

out vec4 fragColor;

// From https://www.shadertoy.com/view/wlG3Rd
float M_PI = 3.1415;

float SCALE = 4.0;
float NUM_OCTAVES = 2.0;
float SCALE_TIME = 0.25;

float SCALE_CONTOUR = 32.0;
vec3 COLOR1 = vec3(1.0, 0.0, 1.0);
vec3 COLOR2 = vec3(0.0, 1.0, 1.0);

// R -> [0, 1)
float hash11(float t) {
  return fract(sin(t * 56789.0) * 56789.0);
}

// R^2 -> [0, 1)
float hash21(vec2 uv) {
  return hash11(hash11(uv[0]) + 2.0 * hash11(uv[1]));
}

vec2 hashGradient2(vec2 uv) {
  float t = hash21(uv);
  return vec2(cos(2.0 * M_PI * t), sin(2.0 * M_PI * t));
}

float mix2(float f00, float f10, float f01, float f11, vec2 uv) {
  return mix(mix(f00, f10, uv[0]), mix(f01, f11, uv[0]), uv[1]);
}

// R^2 -> [0, 1)
// support additional argument to rotate gradient
float gradientNoise(vec2 uv, float r) {
  vec2 uvi = floor(uv);
  vec2 uvf = uv - uvi;
  mat2 R = mat2(
    cos(r), sin(r),
   -sin(r), cos(r)
  );
  vec2 g00 = R * hashGradient2(uvi + vec2(0.0, 0.0));
  vec2 g10 = R * hashGradient2(uvi + vec2(1.0, 0.0));
  vec2 g01 = R * hashGradient2(uvi + vec2(0.0, 1.0));
  vec2 g11 = R * hashGradient2(uvi + vec2(1.0, 1.0));
  float f00 = dot(g00, uvf - vec2(0.0, 0.0));
  float f10 = dot(g10, uvf - vec2(1.0, 0.0));
  float f01 = dot(g01, uvf - vec2(0.0, 1.0));
  float f11 = dot(g11, uvf - vec2(1.0, 1.0));
  float t = mix2(f00, f10, f01, f11, smoothstep(vec2(0.0), vec2(1.0), uvf));

  // Normalize via upper/lower bound = +- 1 / sqrt(2) ~ 0.7
  return (t / 0.7 + 1.0) * 0.5;
}

float noise(vec2 uv, float r) {
  float result = 0.0;
  for (float i = 0.0; i < NUM_OCTAVES; i++) {
    float p = pow(2.0, i);
    result += (gradientNoise(uv * p, r) / p);
  }
  result /= (pow(2.0, NUM_OCTAVES) - 1.0) / (pow(2.0, NUM_OCTAVES - 1.0));
  return result;
}

float wave(float t) {
  return 0.5 * (1.0 - cos(SCALE_CONTOUR * M_PI * t));
}

void main(void){
  ${GAUSSIAN_KERNEL}
  float alpha = 0.0;
  float ONE_PIXEL = 1.0 / float(textureSize(sampler0, 0).x);
  for (int i = 0; i < KERNEL_SIZE; i++) {
    float newAlpha = texture(sampler0, uv + vec2(ONE_PIXEL * (float(i) - 0.5 * float(KERNEL_SIZE)), 0.0)).a;
    newAlpha *= step(0.99, newAlpha);
    alpha += GAUSSIAN_KERNEL[i] * newAlpha;
	}

  const float MAX_ALPHA = 0.25;
  alpha *= MAX_ALPHA;

  float noiseVal = noise(SCALE * uv, SCALE_TIME * 2.0 * M_PI * time);
  alpha *= clamp(1.0 - length(clickPos - uv) / (1.0 * (dt - 0.5)) + noiseVal, 0.0, 1.0);

  vec3 color = mix(COLOR1, COLOR2, noiseVal);

  fragColor = vec4(color * alpha, alpha);
}`;

const initTime = new Date().getTime() / 1000;
let colorAndHorizontalBlurProgram: WebGLProgram;
let timeLocation: WebGLUniformLocation;
let dtLocation: WebGLUniformLocation;
let clickPosLocation: WebGLUniformLocation;
let maskTexture: WebGLTexture;
let blurTexture: WebGLTexture;
let blurFB: WebGLFramebuffer;


// Pass 2
const verticalBlurVertexShaderSrc = `#version 300 es
out vec2 uv;

void main(void) {
  const vec2 QUAD[4] = vec2[](
    vec2(-1.0, 1.0), vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
  );
  vec2 pos = QUAD[gl_VertexID];
  gl_Position = vec4(pos, 0.0, 1.0);
  uv = 0.5 * (pos + 1.0);
}`;

const verticalBlurFragmentShaderSrc = `#version 300 es
precision highp float;

uniform sampler2D sampler0;

in vec2 uv;

out vec4 fragColor;

void main(void) {
  ${GAUSSIAN_KERNEL}
  vec4 color = vec4(0.0);
  float ONE_PIXEL = 1.0 / float(textureSize(sampler0, 0).y);
  for (int i = 0; i < KERNEL_SIZE; i++) {
    vec4 newColor = texture(sampler0, uv + vec2(0.0, ONE_PIXEL * (float(i) - 0.5 * float(KERNEL_SIZE))));
    color += GAUSSIAN_KERNEL[i] * newColor;
	}
  fragColor = color;
}`;

let verticalBlurProgram: WebGLProgram;

const initTexture = (ctx: WebGL2RenderingContext) => {
  const texture = ctx.createTexture()!;
  ctx.bindTexture(ctx.TEXTURE_2D, texture);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
  return texture;
};

const initProgram = (ctx: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string) => {
  var vertexShader = ctx.createShader(ctx.VERTEX_SHADER)!;
  var fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER)!;
  ctx.shaderSource(vertexShader, vertexSrc);
  ctx.shaderSource(fragmentShader, fragmentSrc);
  ctx.compileShader(vertexShader);
  ctx.compileShader(fragmentShader);

  const program = ctx.createProgram()!;
  ctx.attachShader(program, vertexShader);
  ctx.attachShader(program, fragmentShader);

  ctx.linkProgram(program);

  return program;
};

export const colorizeAndBlurMask = (ctx: WebGL2RenderingContext, width: number, height: number, maskData: Uint8Array, dt: number, clickPosNorm: { x: number, y: number }) => {
  // Initialize programs
  if (!colorAndHorizontalBlurProgram) {
    maskTexture = initTexture(ctx);

    // Pass 1
    {
      colorAndHorizontalBlurProgram = initProgram(ctx, colorAndHorizontalBlurVertexShaderSrc, colorAndHorizontalBlurFragmentShaderSrc);

      blurTexture = initTexture(ctx);
      blurFB = ctx.createFramebuffer()!;
      ctx.bindFramebuffer(ctx.FRAMEBUFFER, blurFB);
      ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, width, height, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
      ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, blurTexture, 0);

      timeLocation = ctx.getUniformLocation(colorAndHorizontalBlurProgram, "time")!;
      dtLocation = ctx.getUniformLocation(colorAndHorizontalBlurProgram, "dt")!;
      clickPosLocation = ctx.getUniformLocation(colorAndHorizontalBlurProgram, "clickPos")!;
    }

    // Pass 2
    {
      verticalBlurProgram = initProgram(ctx, verticalBlurVertexShaderSrc, verticalBlurFragmentShaderSrc);
    }
  }

  ctx.viewport(0, 0, width, height);

  // Transfer mask texture to GPU
  ctx.activeTexture(ctx.TEXTURE0);
  ctx.bindTexture(ctx.TEXTURE_2D, maskTexture);
  ctx.pixelStorei(ctx.UNPACK_ALIGNMENT, 1);
  ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);
  ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.ALPHA, width, height, 0, ctx.ALPHA, ctx.UNSIGNED_BYTE, maskData);
  ctx.pixelStorei(ctx.UNPACK_ALIGNMENT, 4);
  ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);

  // Colorize and horizontal blur into the blur framebuffer
  ctx.useProgram(colorAndHorizontalBlurProgram);
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, blurFB);
  ctx.bindTexture(ctx.TEXTURE_2D, maskTexture);
  ctx.uniform1f(timeLocation, new Date().getTime() / 1000 - initTime);
  ctx.uniform1f(dtLocation, dt);
  ctx.uniform2fv(clickPosLocation, [clickPosNorm.x, clickPosNorm.y]);
  ctx.drawArrays(ctx.TRIANGLE_FAN, 0, 4);

  // Vertical blur back into the canvas
  ctx.useProgram(verticalBlurProgram);
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  ctx.bindTexture(ctx.TEXTURE_2D, blurTexture);
  ctx.drawArrays(ctx.TRIANGLE_FAN, 0, 4);
};