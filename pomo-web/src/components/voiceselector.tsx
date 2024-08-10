import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAtom } from "jotai";
import { voicesAtom, selectedVoiceIdAtom } from "@/atoms";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { PlayArrow, Pause } from "@mui/icons-material";

const gradientColors = [
  ["#FE6B8B", "#FF8E53"],
  ["#2196F3", "#21CBF3"],
  ["#00C9FF", "#92FE9D"],
  ["#FC466B", "#3F5EFB"],
  ["#3F2B96", "#A8C0FF"],
  ["#11998e", "#38ef7d"],
  ["#108dc7", "#ef8e38"],
  ["#009245", "#FCEE21"],
];

const VoiceItem: React.FC<{
  name: string;
  voiceId: string;
  previewUrl: string;
  isSelected: boolean;
  onSelect: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  gradientStyle: string;
}> = ({
  name,
  voiceId,
  isSelected,
  onSelect,
  isPlaying,
  onPlayPause,
  gradientStyle,
}) => {
  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <Tooltip title="Select Voice" placement="top-end">
        <Box
          onClick={onSelect}
          sx={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: gradientStyle,
              position: "relative",
              border: isSelected ? "3px solid black" : "none",
              "&:hover": {
                "& .MuiIconButton-root": {
                  opacity: 1,
                },
              },
            }}
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              size="small"
              sx={{
                color: "white",
                position: "absolute",
                opacity: 0,
                transition: "opacity 0.3s",
                backgroundColor: "rgba(0,0,0,0.3)",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.5)",
                },
              }}
              className="MuiIconButton-root"
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Box>
          <ListItemText
            primary={name}
            sx={{
              ml: 2,
              "& .MuiListItemText-primary": {
                fontWeight: isSelected ? 700 : 400,
                color: isSelected ? "text.primary" : "text.secondary",
              },
            }}
          />
        </Box>
      </Tooltip>
    </ListItem>
  );
};

export default function VoiceSelector() {
  const [voices] = useAtom(voicesAtom);
  const [selectedVoiceId, setSelectedVoiceId] = useAtom(selectedVoiceIdAtom);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sortedVoices = useMemo(
    () => [...voices].sort((a, b) => a.name.localeCompare(b.name)),
    [voices]
  );

  const gradientStyles = useMemo(
    () =>
      sortedVoices.map((_, index) => {
        const colors = gradientColors[index % gradientColors.length];
        const angle = Math.floor(Math.random() * 360);
        return `linear-gradient(${angle}deg, ${colors[0]} 10%, ${colors[1]} 90%)`;
      }),
    [sortedVoices]
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = (voiceId: string, previewUrl: string) => {
    if (playingVoiceId === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(previewUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingVoiceId(null);
      setPlayingVoiceId(voiceId);
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography
        variant="h6"
        sx={{
          pb: 1,
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        Select Voice
      </Typography>
      <List
        sx={{
          width: "100%",
          bgcolor: "transparent",
          overflowY: "auto",
          flexGrow: 1,
        }}
      >
        {sortedVoices.map((voice, index) => (
          <VoiceItem
            key={voice.voice_id}
            name={voice.name}
            voiceId={voice.voice_id}
            previewUrl={voice.preview_url}
            isSelected={selectedVoiceId === voice.voice_id}
            onSelect={() => setSelectedVoiceId(voice.voice_id)}
            isPlaying={playingVoiceId === voice.voice_id}
            onPlayPause={() =>
              handlePlayPause(voice.voice_id, voice.preview_url)
            }
            gradientStyle={gradientStyles[index]}
          />
        ))}
      </List>
    </Box>
  );
}
