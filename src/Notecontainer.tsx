import styled from "@emotion/styled";

interface NoteData {
  id: string | number;
  position: number;
}
interface NoteContainerProps {
  note: NoteData;
  board: string;
}

const NoteContainer: React.FC<NoteContainerProps> = ({ note, board }) => {
  return (
    <Container key={note.id} style={{ top: `${note.position}%` }}>
      <Note
        style={{
          boxShadow: `0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px ${board}`,
        }}
      />
    </Container>
  );
};

const Container = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  width: 90%;
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

export default NoteContainer;
