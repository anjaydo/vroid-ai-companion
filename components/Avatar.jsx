"use client";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Euler, Object3D, Quaternion, Vector3 } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { remapMixamoAnimationToVrm } from "@/utils/remapMixamoAnimationToVrm";
import { AVATAR_LIST_FLIP, LOCAL_URL } from "@/constants";
import useAdvancedLipSync from "@/hooks/useAdvanceLipSync";

const tmpVec3 = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

export default function Avatar({
  avatar,
  isPlaying,
  isThinking,
  audioUrl,
  setAudioUrl,
  ...props
}) {
  const assetC = useFBX("models/animations/Breathing Idle.fbx");
  const assetA = useFBX("models/animations/Swing Dancing.fbx");
  const assetB = useFBX("models/animations/Thriller Part 2.fbx");
  const assetD = useFBX("models/animations/Thinking.fbx");
  const assetE = useFBX("models/animations/Kiss.fbx");
  const [isKissing, setIsKissing] = useState(false);

  const { scene, userData } = useGLTF(
    `models/${avatar}`,
    undefined,
    undefined,
    (loader) => {
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
    }
  );

  const currentVrm = userData.vrm;
  const { startLipSyncFromFile } = useAdvancedLipSync(currentVrm);

  useControls({
    "Debug Lip Sync": {
      value: false,
      onChange: async (play) => {
        if (play) {
          const exampleAudio = `${LOCAL_URL}/test/85418dc4-f034-44a0-bf13-b7ac1c981c6e.wav`;
          await startLipSyncFromFile(exampleAudio);
        }
      },
    },
  });

  const animationClipA = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetA);
    clip.name = "Swing Dancing";
    return clip;
  }, [assetA, currentVrm, avatar]);

  const animationClipB = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetB);
    clip.name = "Thriller Part 2";
    return clip;
  }, [assetB, currentVrm, avatar]);

  const animationClipC = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetC);
    clip.name = "Idle";
    return clip;
  }, [assetC, currentVrm, avatar]);

  const animationClipD = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetD);
    clip.name = "Thinking";
    return clip;
  }, [assetD, currentVrm, avatar]);

  const animationClipE = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetE);
    clip.name = "Kiss";
    return clip;
  }, [assetE, currentVrm, avatar]);

  const { actions } = useAnimations(
    [
      animationClipA,
      animationClipB,
      animationClipC,
      animationClipD,
      animationClipE,
    ],
    currentVrm.scene
  );

  useEffect(() => {
    const vrm = userData.vrm;
    console.log("VRM loaded:", vrm);
    // calling these functions greatly improves the performance
    VRMUtils.removeUnnecessaryVertices(scene);
    VRMUtils.combineSkeletons(scene);
    VRMUtils.combineMorphs(vrm);

    // Disable frustum culling
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }, [scene]);

  // const setResultsCallback = useVideoRecognition(
  //   (state) => state.setResultsCallback
  // );
  // const videoElement = useVideoRecognition((state) => state.videoElement);
  const riggedFace = useRef();
  const riggedPose = useRef();
  const riggedLeftHand = useRef();
  const riggedRightHand = useRef();

  const lerpExpression = (name, value, lerpFactor) => {
    userData.vrm.expressionManager.setValue(
      name,
      typeof value === "string"
        ? value
        : lerp(userData.vrm.expressionManager.getValue(name), value, lerpFactor)
    );
  };

  useEffect(() => {
    const startLipSync = async () => {
      if (audioUrl) {
        await startLipSyncFromFile(audioUrl, () => {
          setAudioUrl(null);
        });
      }
    };
    startLipSync();
  }, [audioUrl]);

  const {
    aa,
    ih,
    ee,
    oh,
    ou,
    blinkLeft,
    blinkRight,
    angry,
    sad,
    happy,
    animation,
  } = useControls("VRM", {
    aa: { value: 0, min: 0, max: 1 },
    ih: { value: 0, min: 0, max: 1 },
    ee: { value: 0, min: 0, max: 1 },
    oh: { value: 0, min: 0, max: 1 },
    ou: { value: 0, min: 0, max: 1 },
    blinkLeft: { value: 0, min: 0, max: 1 },
    blinkRight: { value: 0, min: 0, max: 1 },
    angry: { value: 0, min: 0, max: 1 },
    sad: { value: 0, min: 0, max: 1 },
    happy: { value: 0, min: 0, max: 1 },
    animation: {
      options: ["Idle", "Swing Dancing", "Thriller Part 2", "Thinking", "Kiss"],
      value: "Idle",
    },
  });

  useEffect(() => {
    if (animation === "None") {
      actions["Idle"]?.play();
      return;
    }
    actions[animation]?.play();
    return () => {
      actions[animation]?.stop();
    };
  }, [actions, animation]);

  const resetExpression = (delta) => {
    [
      {
        name: "angry",
        value: angry,
      },
      {
        name: "sad",
        value: sad,
      },
      {
        name: "happy",
        value: happy,
      },
      {
        name: "aa",
        value: aa,
      },
      {
        name: "ih",
        value: ih,
      },
      {
        name: "ee",
        value: ee,
      },
      {
        name: "oh",
        value: oh,
      },
      {
        name: "ou",
        value: ou,
      },
      {
        name: "blinkLeft",
        value: blinkLeft,
      },
      {
        name: "blinkRight",
        value: blinkRight,
      },
    ].forEach((item) => {
      lerpExpression(item.name, item.value, delta * 12);
    });
  };

  const rotateBone = (
    boneName,
    value,
    slerpFactor,
    flip = {
      x: 1,
      y: 1,
      z: 1,
    }
  ) => {
    const bone = userData.vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!bone) {
      console.warn(
        `Bone ${boneName} not found in VRM humanoid. Check the bone name.`
      );
      console.log("userData.vrm.humanoid.bones", userData.vrm.humanoid);
      return;
    }

    tmpEuler.set(value.x * flip.x, value.y * flip.y, value.z * flip.z);
    tmpQuat.setFromEuler(tmpEuler);
    bone.quaternion.slerp(tmpQuat, slerpFactor);
  };

  const animateShy = () => {
    console.log("clicked");
  };

  const animateKiss = () => {
    // userData.vrm.expressionManager.setValue("happy", 0.3);
    // userData.vrm.expressionManager.setValue("blinkLeft", 1);
    // userData.vrm.expressionManager.setValue("blinkRight", 1);
    actions["Idle"]?.stop();
    actions["Kiss"]?.play();
    setIsKissing(true);
    setTimeout(() => {
      // userData.vrm.expressionManager.setValue("happy", 0);
      // userData.vrm.expressionManager.setValue("blinkLeft", 0);
      // userData.vrm.expressionManager.setValue("blinkRight", 0);
      actions["Kiss"]?.stop();
      actions["Idle"]?.play();
      setIsKissing(false);
    }, 5000);
  };

  useEffect(() => {
    document?.body
      ?.querySelector("canvas")
      ?.addEventListener("click", animateKiss);
    return () => {
      document?.body
        ?.querySelector("canvas")
        ?.removeEventListener("click", animateKiss);
    };
  }, []);

  const audioTime = useRef(0);

  useFrame((_, delta) => {
    if (!userData?.vrm) {
      return;
    }
    if (!audioUrl) {
      resetExpression(delta);
    }
    if (isThinking) {
      lerpExpression("blinkLeft", 0.4, delta * 12);
      lerpExpression("blinkRight", 0.4, delta * 12);
      lerpExpression("angry", 1, delta * 12);
    }
    userData?.vrm?.update(delta);
  });

  useEffect(() => {
    if (isThinking) {
      actions["Idle"]?.stop();
      actions["Thinking"]?.play();
    } else {
      actions["Thinking"]?.stop();
      actions["Idle"]?.play();
    }
  }, [isThinking]);

  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const camera = useThree((state) => state.camera);
  const lookAtTarget = useRef();
  useEffect(() => {
    lookAtTarget.current = new Object3D();
    camera.add(lookAtTarget.current);
  }, [camera]);

  return (
    <group {...props}>
      <primitive
        object={scene}
        rotation-y={
          AVATAR_LIST_FLIP?.includes(avatar?.split(".")[0]) ? Math.PI : 0
        }
      />
    </group>
  );
}
