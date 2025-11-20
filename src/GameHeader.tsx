import { Pause, Play } from "lucide-react";

import styled from "@emotion/styled";

interface GameHeaderProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>; // 버튼 클릭 이벤트 핸들러
  combo: number; // 콤보 숫자
  score: number; // 점수 숫자
  isPlaying: boolean; // 재생/일시정지 상태
}

const Header = styled.div`
  position: absolute;
  top: 2rem;
  left: 2rem;
  right: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 20;
`;
const PauseButton = styled.button`
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(0.25rem);
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
`;
const ScoreDisplay = styled.div`
  text-align: right;
`;
const ScoreText = styled.div`
  font-size: 4.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const ComboLabel = styled.div`
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ComboText = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: white;
`;

const GameHeader: React.FC<GameHeaderProps> = ({
  onClick,
  combo,
  score,
  isPlaying,
}) => {
  return (
    <Header>
      <PauseButton onClick={onClick}>
        {isPlaying ? <Pause /> : <Play />}
      </PauseButton>

      <ScoreDisplay>
        <ScoreText>{score}</ScoreText>
        <ComboLabel>COMBO</ComboLabel>
        <ComboText>{combo}</ComboText>
      </ScoreDisplay>
    </Header>
  );
};

export default GameHeader;
