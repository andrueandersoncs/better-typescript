import * as THREE from "three"

type BoardSurface = "substrate" | "region" | "component" | "detail" | "trace" | "status"

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
  substrate: { roughness: 0.74, metalness: 0.06, clearcoat: 0.18, clearcoatRoughness: 0.58, sheen: 0.04, rim: 0.018, topLift: 0.008, machining: 0 },
  region: { roughness: 0.64, metalness: 0.08, clearcoat: 0.28, clearcoatRoughness: 0.44, sheen: 0.06, rim: 0.025, topLift: 0.012, machining: 0 },
  component: { roughness: 0.28, metalness: 0.18, clearcoat: 0.72, clearcoatRoughness: 0.2, sheen: 0.2, rim: 0.09, topLift: 0.026, machining: 0.009 },
  detail: { roughness: 0.3, metalness: 0.58, clearcoat: 0.46, clearcoatRoughness: 0.22, sheen: 0.1, rim: 0.06, topLift: 0.02, machining: 0.018 },
  trace: { roughness: 0.22, metalness: 0.78, clearcoat: 0.62, clearcoatRoughness: 0.16, sheen: 0.08, rim: 0.08, topLift: 0.03, machining: 0.026 },
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
