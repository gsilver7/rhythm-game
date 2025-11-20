import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import React, { useState, useEffect, useRef } from "react";
import { Music, Play, Volume2, Trophy, RotateCcw } from "lucide-react";
import * as Tone from "tone";
import GameHeader from "./GameHeader";
import NoteContainer from "./Notecontainer";

interface PatternCollection {
  simple: number[][];
  medium: number[][];
  complex: number[][];
}
interface Note {
  id: number;
  lane: number;
  position: number;
  hit: boolean;
}
interface DifficultySetting {
  speed: number;
  interval: number;
  pattern: "simple" | "medium" | "complex";
}
type LaneEffect = "hit" | "miss" | null;

interface DifficultySettings {
  easy: DifficultySetting;
  normal: DifficultySetting;
  hard: DifficultySetting;
}
type DifficultyLevel = keyof DifficultySettings;
type HitQuality = "good" | "great" | "perfect";

const RhythmGame = () => {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [noteId, setNoteId] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("normal");
  const [highScores, setHighScores] = useState({ easy: 0, normal: 0, hard: 0 });
  const [showMenu, setShowMenu] = useState(true);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [laneEffects, setLaneEffects] = useState<LaneEffect[]>([
    null,
    null,
    null,
    null,
  ]);
  const gameAreaRef = useRef(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const drumRef = useRef<Tone.MembraneSynth | null>(null);

  const lanes = [0, 1, 2, 3];
  const keys = ["d", "f", "j", "k"];

  const difficultySettings: DifficultySettings = {
    easy: { speed: 1.5, interval: 1200, pattern: "simple" },
    normal: { speed: 2, interval: 800, pattern: "medium" },
    hard: { speed: 2.5, interval: 500, pattern: "complex" },
  };

  const patterns: PatternCollection = {
    simple: [[0], [1], [2], [3]],
    medium: [[0], [1], [2], [3], [0, 2], [1, 3]],
    complex: [[0], [1], [2], [3], [0, 2], [1, 3], [0, 3], [1, 2], [0, 1, 2, 3]],
  };

  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 },
    }).toDestination();

    drumRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
    }).toDestination();

    return () => {
      if (synthRef.current) synthRef.current.dispose();
      if (drumRef.current) drumRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const beatInterval = setInterval(() => {
      setCurrentBeat((prev) => prev + 1);
      if (drumRef.current) {
        drumRef.current.triggerAttackRelease("C2", "8n");
      }
    }, 600);

    return () => clearInterval(beatInterval);
  }, [isPlaying]);

  const generateNote = () => {
    const settings = difficultySettings[difficulty];
    const patternList = patterns[settings.pattern];
    const pattern = patternList[Math.floor(Math.random() * patternList.length)];

    pattern.forEach((lane) => {
      const newNote = {
        id: noteId + lane,
        lane,
        position: 0,
        hit: false,
      };
      setNotes((prev) => [...prev, newNote]);
    });

    setNoteId((prev) => prev + pattern.length);
  };

  const updateNotes = () => {
    const settings = difficultySettings[difficulty];
    setNotes((prev) => {
      const updated = prev.map((note) => ({
        ...note,
        position: note.position + settings.speed,
      }));

      return updated.filter((note) => {
        if (note.position > 100 && !note.hit) {
          setCombo(0);
          return false;
        }
        return note.position <= 100;
      });
    });
  };

  const playHitSound = (quality: HitQuality) => {
    if (!synthRef.current) return;

    const notes = ["C4", "E4", "G4"];
    const noteIndex = quality === "perfect" ? 2 : quality === "great" ? 1 : 0;
    synthRef.current.triggerAttackRelease(notes[noteIndex], "16n");
  };

  const triggerLaneEffect = (laneIndex: number, isHit: boolean) => {
    const newEffects = [...laneEffects];
    newEffects[laneIndex] = isHit ? "hit" : "miss";
    setLaneEffects(newEffects);

    setTimeout(() => {
      setLaneEffects((prev) => {
        const updated = [...prev];
        updated[laneIndex] = null;
        return updated;
      });
    }, 300);
  };

  const checkHit = (laneIndex: number) => {
    const hitZone = [80, 100];
    let bestNote: Note | null = null;
    let bestDistance = Infinity;

    notes.forEach((note) => {
      if (note.lane === laneIndex && !note.hit) {
        const distance = Math.abs(note.position - 90);
        if (note.position >= hitZone[0] && note.position <= hitZone[1]) {
          if (distance < bestDistance) {
            bestDistance = distance;
            bestNote = note;
          }
        }
      }
    });

    if (bestNote) {
      setNotes((prev) => prev.filter((n) => n.id !== bestNote.id));

      let points = 0;
      let feedbackText = "";
      let quality: HitQuality = "good";

      if (bestDistance < 4) {
        points = 100;
        feedbackText = "PERFECT!";
        quality = "perfect";
      } else if (bestDistance < 7) {
        points = 50;
        feedbackText = "GREAT!";
        quality = "great";
      } else {
        points = 25;
        feedbackText = "GOOD";
      }

      playHitSound(quality);
      triggerLaneEffect(laneIndex, true);
      setScore((prev) => prev + points + combo * 5);
      setCombo((prev) => prev + 1);
      setFeedback(feedbackText);
      setTimeout(() => setFeedback(""), 300);
    } else {
      triggerLaneEffect(laneIndex, false);
      setCombo(0);
      setFeedback("MISS");
      setTimeout(() => setFeedback(""), 300);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;

      const keyIndex = keys.indexOf(e.key.toLowerCase());
      if (keyIndex !== -1) {
        checkHit(keyIndex);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [notes, isPlaying, combo]);

  useEffect(() => {
    if (!isPlaying) return;

    const settings = difficultySettings[difficulty];
    const noteInterval = setInterval(() => {
      generateNote();
    }, settings.interval);

    const updateInterval = setInterval(() => {
      updateNotes();
    }, 16);

    const timeInterval = setInterval(() => {
      setGameTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(noteInterval);
      clearInterval(updateInterval);
      clearInterval(timeInterval);
    };
  }, [isPlaying, noteId]);

  const startGame = async () => {
    await Tone.start();
    setScore(0);
    setCombo(0);
    setNotes([]);
    setNoteId(0);
    setGameTime(0);
    setGameStarted(true);
    setIsPlaying(true);
    setShowMenu(false);
  };

  const togglePause = () => {
    setIsPlaying(!isPlaying);
  };

  const endGame = () => {
    setIsPlaying(false);

    if (score > highScores[difficulty]) {
      setHighScores((prev) => ({
        ...prev,
        [difficulty]: score,
      }));
    }

    setShowMenu(true);
    setGameStarted(false);
  };

  const resetGame = () => {
    setScore(0);
    setCombo(0);
    setNotes([]);
    setNoteId(0);
    setGameTime(0);
    setGameStarted(false);
    setIsPlaying(false);
    setShowMenu(true);
  };

  useEffect(() => {
    if (gameTime >= 60 && isPlaying) {
      endGame();
    }
  }, [gameTime]);

  if (showMenu) {
    return (
      <MenuContainer>
        <MenuCard>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <MusicIcon />
            <MenuTitle>리듬 게임</MenuTitle>
            <MenuSubtitle>60초 동안 최고 점수에 도전하세요!</MenuSubtitle>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <DifficultyTitle>
              <Trophy />
              난이도 선택
            </DifficultyTitle>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {["easy", "normal", "hard"].map((diff) => (
                <DifficultyButton
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  active={difficulty === diff}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {diff === "easy"
                        ? "쉬움"
                        : diff === "normal"
                        ? "보통"
                        : "어려움"}
                    </span>
                    <span style={{ fontSize: "0.875rem" }}>
                      최고: {highScores[diff]}
                    </span>
                  </div>
                </DifficultyButton>
              ))}
            </div>
          </div>

          <StartButton onClick={startGame}>
            <Play/>
            게임 시작
          </StartButton>
        </MenuCard>
      </MenuContainer>
    );
  }
  return (
    <GameContainer>
      <GameContent>
        <GameHeader
          onClick={togglePause}
          combo={combo}
          score={score}
          isPlaying={isPlaying}
        />
        <GameAreaContainer ref={gameAreaRef}>
          {feedback && (
            <FeedbackContainer>
              <FeedbackText>{feedback}</FeedbackText>
            </FeedbackContainer>
          )}

          <Lane3DContainer>
            {lanes.map((lane) => {
              const laneColors = [
                "rgba(251, 191, 36, 0.3)",
                "rgba(251, 146, 60, 0.3)",
                "rgba(236, 72, 153, 0.3)",
                "rgba(168, 85, 247, 0.3)",
              ];
              const laneBorders = [
                "rgb(251, 191, 36)",
                "rgb(251, 146, 60)",
                "rgb(236, 72, 153)",
                "rgb(168, 85, 247)",
              ];

              return (
                <Lane
                  key={lane}
                  bgColor={laneColors[lane]}
                  borderColor={laneBorders[lane]}
                  effect={laneEffects[lane]}
                >
                  <GridLines>
                    {[...Array(20)].map((_, i) => (
                      <GridLine
                        key={i}
                        style={{
                          top: `${i * 5}%`,
                          borderColor: laneBorders[lane],
                        }}
                      />
                    ))}
                  </GridLines>
                  {notes
                    .filter((note) => note.lane === lane)
                    .map((note) => (
                      <NoteContainer
                        key={note.id}
                        note={note}
                        board={laneBorders[lane]}
                      >
                      </NoteContainer>
                    ))}
                </Lane>
              );
            })}
          </Lane3DContainer>
          <HitZone />
        </GameAreaContainer>
        <ControlsContainer>
          <ResetButton onClick={resetGame}>
            <RotateCcw className="w-6 h-6" />
            처음으로
          </ResetButton>
        </ControlsContainer>
      </GameContent>
    </GameContainer>
  );
};

// --- Styled Components ---

// --- Menu Screen ---

const MenuContainer = styled.div`
  min-height: 100vh;
  background-image: linear-gradient(to bottom, #451a03, #2e1065, #000);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const MenuCard = styled.div`
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(1rem);
  border-radius: 1.5rem;
  padding: 2rem;
  max-width: 28rem;
  width: 100%;
  border: 2px solid rgba(251, 191, 36, 0.5);
  box-shadow: 0 0 50px rgba(251, 191, 36, 0.3);
`;

const MusicIcon = styled(Music)`
  width: 4rem;
  height: 4rem;
  color: #fbbf24;
  margin: 0 auto 1rem;
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.8));
`;

const MenuTitle = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
`;

const MenuSubtitle = styled.p`
  color: #fde68a;
`;

const DifficultyTitle = styled.h2`
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DifficultyButton = styled.button`
  width: 100%;
  padding: 1rem;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 1.125rem;
  transition: all 0.2s ease-in-out;
  border: none;
  cursor: pointer;

  ${(props) =>
    props.active
      ? `
        background-image: linear-gradient(to right, #d97706, #ea580c);
        color: white;
        transform: scale(1.05);
        box-shadow: 0 0 30px rgba(251, 191, 36, 0.5);
      `
      : `
        background-color: rgba(255, 255, 255, 0.1);
        color: #fde68a;
        &:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}
`;

const StartButton = styled.button`
  width: 100%;
  padding: 1rem 2rem;
  background-image: linear-gradient(to right, #d97706, #ea580c);
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  &:hover {
    background-image: linear-gradient(to right, #b45309, #c2410c);
  }
`;

const SoundInfo = styled.div`
  margin-top: 1.5rem;
  text-align: center;
  color: #fde68a;
  font-size: 0.875rem;
`;

// --- Game Screen ---

const GameContainer = styled.div`
  min-height: 100vh;
  background-image: linear-gradient(to bottom, #451a03, #2e1065, #000);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow: hidden;
`;

const GameContent = styled.div`
  width: 100%;
  max-width: 72rem;
`;

const GameAreaContainer = styled.div`
  position: relative;
  margin-top: 8rem;
  height: 600px;
  perspective: 800px;
  perspective-origin: center top;
`;

const pulse = keyframes`
  50% { opacity: 0.5; }
`;

const FeedbackContainer = styled.div`
  position: absolute;
  top: 33.33%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  z-index: 50;
`;

const FeedbackText = styled.div`
  font-size: 4.5rem;
  font-weight: 700;
  color: #fde047;
  animation: ${pulse} 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  filter: drop-shadow(0 0 30px rgba(253, 224, 71, 0.8));
  text-shadow: 0 0 20px rgba(253, 224, 71, 0.8),
    0 0 40px rgba(253, 224, 71, 0.6);
`;

const Lane3DContainer = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  transform: rotateX(60deg);
  transform-style: preserve-3d;
`;

const Lane = styled.div`
  position: relative;
  transition: all 0.2s ease-in-out;
  width: 120px;
  height: 100%;
  background: linear-gradient(to top, ${(props) => props.bgColor}, transparent);
  border-left: 2px solid ${(props) => props.borderColor};
  border-right: 2px solid ${(props) => props.borderColor};
  box-shadow: ${(props) =>
    props.effect === "hit"
      ? `inset 0 0 50px ${props.borderColor}, 0 0 30px ${props.borderColor}`
      : props.effect === "miss"
      ? "inset 0 0 50px rgba(239, 68, 68, 0.8)"
      : "none"};
`;

const GridLines = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const GridLine = styled.div`
  position: absolute;
  width: 100%;
  border-top-width: 1px;
  opacity: 0.2;
`;



const Note = styled.div`
  height: 4rem;
  border-radius: 0.5rem;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.9),
    rgba(255, 255, 255, 0.7)
  );
  border: 2px solid rgba(255, 255, 255, 0.5);
`;

const HitZone = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%) rotateX(60deg);
  pointer-events: none;
  z-index: 10;
  bottom: 100px;
  width: 520px; /* (120px * 4) + (0.5rem * 2) * 4 -> approx */
  height: 80px;
  background: linear-gradient(
    to bottom,
    rgba(251, 191, 36, 0.1),
    rgba(251, 191, 36, 0.3),
    rgba(251, 191, 36, 0.1)
  );
  border: 3px solid rgb(251, 191, 36);
  box-shadow: 0 0 40px rgba(251, 191, 36, 0.6),
    inset 0 0 40px rgba(251, 191, 36, 0.3);
`;

const ControlsContainer = styled.div`
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const ResetButton = styled.button`
  padding: 1rem 2rem;
  background-image: linear-gradient(to right, #dc2626, #ea580c);
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &:hover {
    background-image: linear-gradient(to right, #b91c1c, #c2410c);
  }
`;

export default RhythmGame;
