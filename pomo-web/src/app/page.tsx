"use client";

import Pomo from "@/components/pomo";
import WarmStart from "@/components/warmstart";
import { Box } from "@mui/material";

export default function Home() {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <WarmStart />
      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <Pomo />
      </Box>
    </Box>
  );
}
