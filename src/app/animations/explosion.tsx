import { basePath } from "@/config";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ExplosionProps {
  x: number;
  y: number;
  onEnd: () => void;
}

export default function Explosion({
  x,
  y,
  onEnd,
}: ExplosionProps) {
  const [time, setTime] = useState(0);
  const explosionTime = 1000;

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (time >= explosionTime) {
        onEnd();
        return;
      }
      setTime((prevTime) => prevTime + 100);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [time, explosionTime, onEnd]);

  return (
    <div
      className="explosion"
      style={{
        position: "absolute",
        left: x,
        top: y,
      }}
    >
      <Image src={`${basePath}/explosion.png`} width={50} height={50} alt="explosion" />
    </div>
  );
}
