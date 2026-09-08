import * as THREE from "three"

type BoardSurface = "substrate" | "region" | "component" | "cap" | "detail" | "trace" | "status"

type BoardMaterialOptions = {
  readonly color: THREE.ColorRepresentation
  readonly surface: BoardSurface
  readonly accent?: THREE.ColorRepresentation
  readonly emissive?: THREE.ColorRepresentation
  readonly emissiveIntensity?: number
  readonly transparent?: boolean
  readonly opacity?: number
}

const profiles: Record<BoardSurface, {
  readonly roughness: number
  readonly metalness: number
  readonly clearcoat: number
  readonly clearcoatRoughness: number
  readonly sheen: number
  readonly rim: number
  readonly topLift: number
  readonly machining: number
}> = {
  substrate: { roughness: 0.9, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.58, sheen: 0, rim: 0.008, topLift: 0, machining: 0 },
  region: { roughness: 0.85, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.44, sheen: 0, rim: 0.012, topLift: 0, machining: 0 },
  component: { roughness: 0.38, metalness: 0.24, clearcoat: 0.52, clearcoatRoughness: 0.24, sheen: 0.12, rim: 0.06, topLift: 0.01, machining: 0.005 },
  cap: { roughness: 0.16, metalness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.1, sheen: 0.28, rim: 0.075, topLift: 0.065, machining: 0.004 },
  detail: { roughness: 0.3, metalness: 0.58, clearcoat: 0.46, clearcoatRoughness: 0.22, sheen: 0.1, rim: 0.06, topLift: 0.02, machining: 0.018 },
  trace: { roughness: 0.4, metalness: 0.15, clearcoat: 0.32, clearcoatRoughness: 0.16, sheen: 0.08, rim: 0.08, topLift: 0.03, machining: 0.026 },
  status: { roughness: 0.26, metalness: 0.42, clearcoat: 0.58, clearcoatRoughness: 0.18, sheen: 0.14, rim: 0.08, topLift: 0.024, machining: 0.014 },
}

export const createBoardMaterial = ({
  color,
  surface,
  accent = color,
  emissive = 0x000000,
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
}: BoardMaterialOptions) => {
  const profile = profiles[surface]
  const accentColor = new THREE.Color(accent)
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness: profile.roughness,
    metalness: profile.metalness,
    clearcoat: profile.clearcoat,
    clearcoatRoughness: profile.clearcoatRoughness,
    sheen: profile.sheen,
    sheenColor: accentColor,
    sheenRoughness: 0.5,
    transparent,
    opacity,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.semanticAccent = { value: accentColor }
    shader.uniforms.semanticRim = { value: profile.rim }
    shader.uniforms.semanticTopLift = { value: profile.topLift }
    shader.uniforms.semanticMachining = { value: profile.machining }
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
varying vec3 vSemanticPosition;
varying vec3 vSemanticNormal;`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
vSemanticNormal = objectNormal;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vSemanticPosition = transformed;`)
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec3 semanticAccent;
uniform float semanticRim;
uniform float semanticTopLift;
uniform float semanticMachining;
varying vec3 vSemanticPosition;
varying vec3 vSemanticNormal;`)
      .replace("#include <opaque_fragment>", `float semanticFresnel = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.6);
float semanticTop = smoothstep(0.45, 0.98, normalize(vSemanticNormal).y);
float semanticMachinedBand = 0.5 + 0.5 * sin((vSemanticPosition.x + vSemanticPosition.z * 0.72) * 46.0);
outgoingLight += semanticAccent * (
  semanticFresnel * semanticRim
  + semanticTop * semanticTopLift
  + semanticTop * semanticMachinedBand * semanticMachining
);
#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => "semantic-pbr-v1"
  return material
}
