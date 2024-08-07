import React, { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { IconButton, Tooltip } from "@mui/material";
import MicNoneIcon from "@mui/icons-material/MicNone";
import HearingIcon from "@mui/icons-material/Hearing";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

const UNSELECTED_COLOR = "linear-gradient(45deg, #7637FA 0%, #1CB5E0 100%)";
const SELECTED_COLOR =
  "linear-gradient(45deg, #7637FA 0%, #FF0069 50%, #FED602 100%)";

interface SpeakerIconProps {
  isOn: boolean;
  volume: number;
  onClick: () => void;
}

const INITIAL_ICON_SIZE = 30;
const SpeakerIcon: React.FC<SpeakerIconProps> = ({ isOn, volume, onClick }) => {
  const [iconSize, setIconSize] = useState(INITIAL_ICON_SIZE);

  useEffect(() => {
    setIconSize(INITIAL_ICON_SIZE + volume / 100);
  }, [volume]);

  return (
    <Tooltip title={isOn ? "TTS On" : "TTS Off"}>
      <IconButton
        onClick={onClick}
        sx={{
          transition: "all 0.1s ease",
          color: "white",
          background: isOn ? SELECTED_COLOR : "grey",
          "&:hover": {
            background: SELECTED_COLOR,
            transform: "scale(1.1)",
          },
        }}
      >
        <Volume2 />
      </IconButton>
    </Tooltip>
  );
};

interface HearingIconProps {
  isOn: boolean;
  onClick: () => void;
}
const AppHearingIcon: React.FC<HearingIconProps> = ({ isOn, onClick }) => {
  return (
    <Tooltip title={isOn ? "Sending audio" : "Not sending audio"}>
      <IconButton
        onClick={onClick}
        sx={{
          transition: "all 0.1s ease",
          color: "white",
          background: isOn ? SELECTED_COLOR : "grey",
          "&:hover": {
            background: SELECTED_COLOR,
            transform: "scale(1.1)",
          },
        }}
      >
        <HearingIcon />
      </IconButton>
    </Tooltip>
  );
};

interface PhotoIconProps {
  isOn: boolean;
  onClick: () => void;
}
const PhotoIcon: React.FC<PhotoIconProps> = ({ isOn, onClick }) => {
  return (
    <Tooltip title={isOn ? "Sending images" : "Not sending images"}>
      <IconButton
        onClick={onClick}
        sx={{
          transition: "all 0.1s ease",
          color: "white",
          background: isOn ? SELECTED_COLOR : "grey",
          "&:hover": {
            background: SELECTED_COLOR,
            transform: "scale(1.1)",
          },
        }}
      >
        <PhotoCameraIcon />
      </IconButton>
    </Tooltip>
  );
};

interface GradientMicButtonProps {
  onClick: () => void;
  isRecording: boolean;
}

const GradientMicButton: React.FC<GradientMicButtonProps> = ({
  onClick,
  isRecording,
}) => (
  <Tooltip title={isRecording ? "Stop Recording" : "Start Recording"}>
    <IconButton
      sx={{
        position: "absolute",
        bottom: 20,
        right: 20,
        background: isRecording ? SELECTED_COLOR : UNSELECTED_COLOR,
        color: "white",
        border: isRecording ? "3px solid white" : "none",
        transition: "all 0.3s ease",
        "&:hover": {
          background: SELECTED_COLOR,
          transform: "scale(1.1)",
        },
      }}
      onClick={onClick}
    >
      <MicNoneIcon sx={{ color: "white" }} />
    </IconButton>
  </Tooltip>
);

export { SpeakerIcon, AppHearingIcon, PhotoIcon, GradientMicButton };