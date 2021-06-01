varying vec4 vViewUv;
varying vec3 vNormal;
varying vec4 vPosition;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize( vec3(modelMatrix * vec4(normal, 0.0)) );
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = - mvPosition.xyz;
  
  vPosition = modelMatrix * vec4( position, 1.0 ); 
  vec4 transformedPosition = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vViewUv = transformedPosition;
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xyz = (vViewUv.xyz + 1.0) * 0.5;
  gl_Position = transformedPosition;  
}
