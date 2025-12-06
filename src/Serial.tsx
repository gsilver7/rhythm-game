import { useState, useEffect, useRef, useCallback } from "react";

interface ReceivedDataItem {
  time: string;
  data: string;
}

interface ParsedObject {
  timestamp: string;
  data: Record<string, any>;
}

interface UseSerialInputReturn {
  isConnected: boolean;
  latestReceivedData: ReceivedDataItem | null; // 배열 → 단일 객체
  latestParsedObject: ParsedObject | null;
  connect: (baudRate?: number) => Promise<void>;
  disconnect: () => Promise<void>;
  clearData: () => void;
}

export function useSerialInput(): UseSerialInputReturn {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestReceivedData, setLatestReceivedData] =
    useState<ReceivedDataItem | null>(null);
  const [latestParsedObject, setLatestParsedObject] =
    useState<ParsedObject | null>(null);

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null
  );
  const parserRef = useRef({
    buffer: "",
    braceCount: 0,
  });

  // JSON 파싱 함수
  const processStreamChunk = useCallback((chunk: string) => {
    const cleaned = chunk.replace(/\[.*?\]\s*/g, "");
    const parser = parserRef.current;

    for (let char of cleaned) {
      if (char === "{") {
        parser.braceCount++;
        parser.buffer += char;
      } else if (char === "}") {
        parser.buffer += char;
        parser.braceCount--;

        if (parser.braceCount === 0 && parser.buffer) {
          try {
            let fixed = parser.buffer.trim();
            if (!fixed.startsWith("{")) {
              fixed = "{" + fixed;
            }

            const obj = JSON.parse(fixed);
            const timestamp = new Date().toLocaleTimeString();

            // 배열에 추가하지 않고 덮어쓰기
            setLatestParsedObject({ timestamp, data: obj });
          } catch (e) {
            console.error("JSON 파싱 에러:", e, "Buffer:", parser.buffer);
          }
          parser.buffer = "";
        }
      } else if (parser.braceCount > 0) {
        parser.buffer += char;
      }
    }
  }, []);

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

        // 마지막 데이터만 저장
        setLatestReceivedData({ time: timestamp, data: text });
        processStreamChunk(text);
      }
    } catch (error) {
      console.error("읽기 오류:", error);
    } finally {
      reader.releaseLock();
    }
  };

  // 연결
  const connect = async (baudRate: number = 115200): Promise<void> => {
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

  // 데이터 초기화
  const clearData = useCallback(() => {
    setLatestReceivedData(null);
    setLatestParsedObject(null);
  }, []);

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      if (port) {
        disconnect();
      }
    };
  }, [port, disconnect]);

  return {
    isConnected,
    latestReceivedData,
    latestParsedObject,
    connect,
    disconnect,
    clearData,
  };
}
