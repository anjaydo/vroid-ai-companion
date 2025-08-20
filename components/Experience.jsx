"use client";
import { useRef, useState } from "react";
import { useControls } from "leva";
import {
  CameraControls,
  Environment,
  Gltf,
  PerspectiveCamera,
} from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Euler, Vector3 } from "three";

export const Experience = ({ children }) => {
  const [mycam, setMycam] = useState(null);
  const cameraProps = useControls("Camera", {
    positionX: { value: -0.1, min: -10, max: 10, step: 0.01 },
    positionY: { value: 1.3, min: -10, max: 10, step: 0.01 },
    positionZ: { value: 3.7, min: -10, max: 10, step: 0.01 },
    rotationX: { value: 0, min: -180, max: 180, step: 1 },
    rotationY: { value: 0, min: -180, max: 180, step: 1 },
    rotationZ: { value: 0, min: -180, max: 180, step: 1 },
    fov: { value: 10, min: 10, max: 120, step: 1 },
    near: { value: 0.1, min: 0.01, max: 1, step: 0.01 },
    far: { value: 1000, min: 100, max: 2000, step: 10 },
  });

  return (
    <>
      <PerspectiveCamera
        ref={setMycam}
        makeDefault
        position={
          new Vector3(
            cameraProps.positionX,
            cameraProps.positionY,
            cameraProps.positionZ
          )
        }
        rotation={
          new Euler(
            cameraProps.rotationX,
            cameraProps.rotationY,
            cameraProps.rotationZ
          )
        }
        fov={cameraProps.fov}
        near={cameraProps.near}
        far={cameraProps.far}
      />
      {/* {mycam && <CameraControls camera={mycam} />} */}
      {/* <Environment preset="sunset" /> */}
      <directionalLight intensity={2} position={[10, 10, 5]} />
      <directionalLight intensity={1} position={[-10, 10, 5]} />
      <group>{children}</group>
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.7} />
      </EffectComposer>
    </>
  );
};
