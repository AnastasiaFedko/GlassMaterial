uniform sampler2D normalTexture;
uniform sampler2D shaderTexture;
uniform samplerCube envMap;
uniform vec2 resolution;
uniform mat4 cameraMatrixInverse;
uniform vec3 eyeDirection;

uniform float roughness;
uniform float fresnelPower;
uniform float fogPower;
uniform float colorPower;
uniform vec3 toneColor;

varying vec3 vNormal;
varying vec4 vPosition;
varying vec4 vViewUv;
varying vec3 vViewPosition;
varying vec3 worldPosition;

const float Air = 1.0;
const float Ice = 1.3098;
const float Eta = Air / Ice;
const float EtaDelta = 1.0 - Eta;
const float R0 = ((Air - Ice) * (Air - Ice)) / ((Air + Ice) * (Air + Ice));

vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN ) {
	vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
	vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
	vec2 st0 = dFdx( vViewUv.st );
	vec2 st1 = dFdy( vViewUv.st );
	float scale = sign( st1.t * st0.s - st0.t * st1.s );
	vec3 S = normalize( ( q0 * st1.t - q1 * st0.t ) * scale );
	vec3 T = normalize( ( - q0 * st1.s + q1 * st0.s ) * scale );
	vec3 N = normalize( surf_norm );
	mat3 tsn = mat3( S, T, N );
	mapN.xy *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );
	return normalize( tsn * mapN );
}


void main() {
  vec4 normalMapColor = texture2D(shaderTexture, vViewUv.xy);
  vec3 normal = normalize( vNormal );	
  normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );  

  float val = texture2D( shaderTexture, vViewUv.xy ).x;

  float valU = texture2D( shaderTexture, vViewUv.xy + vec2( 1.0 / resolution.x, 0.0 ) ).x;

  float valV = texture2D( shaderTexture, vViewUv.xy + vec2( 0.0, 1.0 / resolution.y ) ).x;

  vec3 bumpNormal = normalize(vec3(val - valU, val - valV, 0.02));

  vec3 targetNormal = perturbNormal2Arb( -vViewPosition, normal, bumpNormal );  
  targetNormal = mix(normal, targetNormal, roughness);

  vec2 noiseUv = vec2(vViewUv.xy + targetNormal.xy * 0.01);
  vec4 color = texture2D(shaderTexture, noiseUv.xy);
 
  vec3 viewDir = normalize(vPosition.xyz - cameraPosition);
  vec3 v_refraction = refract(viewDir, targetNormal, 0.95);
  vec3 v_reflection = reflect(viewDir.xyz, targetNormal.xyz);

  vec4 refractColor0 = textureCube( envMap, v_refraction * vec3(-1.0, 1.0,1.0)); 
  vec4 reflectColor0 = textureCube( envMap, v_reflection * vec3(-1.0, 1.0,1.0)); 

  float v_fresnel = clamp(1.0 - dot(-viewDir, targetNormal), 0.0, 1.0);
  float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 4.0)));

  vec3 totalColor = mix(refractColor0, reflectColor0, v_fresnel_ratio).rgb;

  gl_FragColor = vec4(totalColor + (v_fresnel * v_fresnel) * fresnelPower + color.xyz * fogPower + toneColor * colorPower, 1.0);
}