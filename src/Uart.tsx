import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "@emotion/styled";
import { Wifi, WifiOff, Send } from "lucide-react";

interface ReceivedDataItem {
  time: string;
  data: string;
  sent?: boolean;
}

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
  padding: 2rem;
`;

const Content = styled.div`
  max-width: 64rem;
  margin: 0 auto;
`;

const Card = styled.div`
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 1.5rem;
`;

const SettingsPanel = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
`;

const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #374151;
`;

const Select = styled.select<{ disabled?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  outline: none;
  transition: all 0.2s;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};

  &:focus {
    ring: 2px solid #3b82f6;
    border-color: #3b82f6;
  }
`;

const Button = styled.button<{ variant?: "connect" | "disconnect" | "send" }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  color: white;

  ${(props) =>
    props.variant === "disconnect" &&
    `
    background: #ef4444;
    &:hover {
      background: #dc2626;
    }
  `}

  ${(props) =>
    props.variant === "connect" &&
    `
    background: #3b82f6;
    &:hover {
      background: #2563eb;
    }
  `}

  ${(props) =>
    props.variant === "send" &&
    `
    background: #10b981;
    &:hover {
      background: #059669;
    }
  `}

  ${(props) =>
    !props.variant &&
    `
    background: #3b82f6;
    &:hover {
      background: #2563eb;
    }
  `}
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusDot = styled.div<{ connected: boolean }>`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: ${(props) => (props.connected ? "#10b981" : "#d1d5db")};
`;

const StatusText = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`;

const InputSection = styled.div`
  margin-bottom: 1.5rem;
`;

const InputLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  outline: none;
  transition: all 0.2s;

  &:focus {
    ring: 2px solid #3b82f6;
    border-color: #3b82f6;
  }
`;

const DataSection = styled.div``;

const DataHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ClearButton = styled.button`
  font-size: 0.875rem;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }
`;

const Terminal = styled.div`
  background: #111827;
  color: #10b981;
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  padding: 1rem;
  border-radius: 0.5rem;
  height: 24rem;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  color: #6b7280;
  text-align: center;
  margin-top: 2rem;
`;

const DataLine = styled.div<{ sent?: boolean }>`
  margin-bottom: 0.25rem;
  color: ${(props) => (props.sent ? "#60a5fa" : "#10b981")};
`;

const Timestamp = styled.span`
  color: #6b7280;
`;

const Notice = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 0.5rem;
`;

const NoticeText = styled.p`
  font-size: 0.875rem;
  color: #92400e;
  margin: 0;
`;

export default function SerialComponent() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [receivedData, setReceivedData] = useState<ReceivedDataItem[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [baudRate, setBaudRate] = useState<number>(115200);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );

  // 연결
  const connectSerial = async (): Promise<void> => {
    try {
      if (!("serial" in navigator)) {
        alert(
          "이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome/Edge를 사용해주세요."
        );
        return;
      }

      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate });

      setPort(selectedPort);
      setIsConnected(true);

      readData(selectedPort);
    } catch (error) {
      console.error("연결 실패:", error);
      alert(`연결 실패: ${(error as Error).message}`);
    }
  };

  // 데이터 읽기
  const readData = async (selectedPort: SerialPort): Promise<void> => {
    if (!selectedPort.readable) return;

    const reader = selectedPort.readable.getReader();
    readerRef.current = reader;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const timestamp = new Date().toLocaleTimeString();

        setReceivedData((prev) => [...prev, { time: timestamp, data: text }]);
      }
    } catch (error) {
      console.error("읽기 오류:", error);
    } finally {
      reader.releaseLock();
    }
  };

  // 데이터 보내기
  const sendData = async (): Promise<void> => {
    if (!port || !inputText || !port.writable) return;

    try {
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(inputText + "\n"));
      writer.releaseLock();

      const timestamp = new Date().toLocaleTimeString();
      setReceivedData((prev) => [
        ...prev,
        { time: timestamp, data: `→ ${inputText}`, sent: true },
      ]);

      setInputText("");
    } catch (error) {
      console.error("전송 실패:", error);
      alert(`전송 실패: ${(error as Error).message}`);
    }
  };

  // 연결 해제
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (port) {
        await port.close();
      }
      setPort(null);
      setIsConnected(false);
    } catch (error) {
      console.error("연결 해제 실패:", error);
    }
  }, [port]);

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      if (port) {
        disconnect();
      }
    };
  }, [port, disconnect]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      sendData();
    }
  };

  return (
    <Container>
      <Content>
        <Card>
          <Title>Web Serial API (UART) 통신</Title>

          <SettingsPanel>
            <SettingsRow>
              <Label>보드레이트:</Label>
              <Select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={isConnected}
              >
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
                <option value={57600}>57600</option>
                <option value={115200}>115200</option>
              </Select>

              <Button
                onClick={isConnected ? disconnect : connectSerial}
                variant={isConnected ? "disconnect" : "connect"}
                style={{ marginLeft: "auto" }}
              >
                {isConnected ? (
                  <>
                    <WifiOff size={20} />
                    연결 해제
                  </>
                ) : (
                  <>
                    <Wifi size={20} />
                    연결
                  </>
                )}
              </Button>
            </SettingsRow>

            <StatusRow>
              <StatusDot connected={isConnected} />
              <StatusText>{isConnected ? "연결됨" : "연결 안됨"}</StatusText>
            </StatusRow>
          </SettingsPanel>

          {isConnected && (
            <InputSection>
              <InputLabel>데이터 전송:</InputLabel>
              <InputRow>
                <Input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="전송할 데이터 입력..."
                />
                <Button onClick={sendData} variant="send">
                  <Send size={20} />
                  전송
                </Button>
              </InputRow>
            </InputSection>
          )}

          <DataSection>
            <DataHeader>
              <InputLabel>수신 데이터:</InputLabel>
              <ClearButton onClick={() => setReceivedData([])}>
                초기화
              </ClearButton>
            </DataHeader>
            <Terminal>
              {receivedData.length === 0 ? (
                <EmptyState>수신된 데이터가 없습니다</EmptyState>
              ) : (
                receivedData.map((item, index) => (
                  <DataLine key={index} sent={item.sent}>
                    <Timestamp>[{item.time}]</Timestamp> {item.data}
                  </DataLine>
                ))
              )}
            </Terminal>
          </DataSection>

          <Notice>
            <NoticeText>
              <strong>주의:</strong> Web Serial API는 Chrome/Edge 브라우저에서만
              작동합니다. HTTPS 또는 localhost에서 실행해야 하며, 사용자가 직접
              포트를 선택해야 합니다.
            </NoticeText>
          </Notice>
        </Card>
      </Content>
    </Container>
  );
}
