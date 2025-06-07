import { basePath } from "@/config";
import Image from "next/image";
import { useEffect, useState } from "react";

interface MissileProps {
  x: number;
  y: number;
  toX: number;
  toY: number;
  duration: number;
  hasExplosion: boolean;
  onEnd: () => void;
}

export default function Missile({
  x,
  y,
  toX,
  toY,
  duration,
  hasExplosion,
  onEnd,
}: MissileProps) {
  const [state, setState] = useState("missle");
  const [time, setTime] = useState(0);

  const explosionTime = 1000;

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (state === "missle" && time >= duration) {
        if (hasExplosion) {
          setState("explosion");
        } else {
          onEnd();
          return;
        }
      }
      if (time >= duration + explosionTime) {
        onEnd();
        return;
      }
      setTime(time + 100);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, time, duration, onEnd, hasExplosion]);

  if (state === "missle") {
    const curX = x + (toX - x) * (time / duration);
    const curY = y + (toY - y) * (time / duration);

    const transform = `rotate(${Math.atan2(toX - x, y - toY)}rad)`;

    return (
      <div
        className="missile"
        style={{
          position: "absolute",
          left: curX,
          top: curY,
          transform: transform,
        }}
      >
        <Image src={`${basePath}/missile.png`} width={50} height={50} alt="missile" />
      </div>
    );
  } else {
    return <div
      className="explosion"
      style={{
        position: "absolute",
        left: toX,
        top: toY,
      }}
    >
      <Image src={`${basePath}/explosion.png`} width={50} height={50} alt="explosion" />
    </div>;
  }
}
