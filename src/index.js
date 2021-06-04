import * as THREE from 'three';
import * as dat from 'dat.gui';

import styles from './style.css';

import vertexShaderBla from '../src/FinalShader/vertex.glsl';
import fragmentCode from '../src/FinalShader/fragment.glsl';
import vertexShaderBlaMaterial from '../src/ShaderMaterial/vertex.glsl';
import fragmentCodeMaterial from '../src/ShaderMaterial/fragment.glsl';

import { OBJLoader } from '../node_modules/three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../node_modules/three/examples/jsm/loaders/MTLLoader.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass';

import bunnyMtl from '../assets/BunnyObj/stanford-bunny.mtl';
import bunnyObj from '../assets/BunnyObj/stanford-bunny.obj';
import px from '../assets/EnvMap/px.png';
import py from '../assets/EnvMap/py.png';
import pz from '../assets/EnvMap/pz.png';
import nx from '../assets/EnvMap/nx.png';
import ny from '../assets/EnvMap/ny.png';
import nz from '../assets/EnvMap/nz.png';

const canvas = document.createElement('canvas');
//const canvas = document.querySelector('#canvas');
const div = document.querySelector('div');
div.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false })
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(div.clientWidth, div.clientHeight);
//renderer.setSize(window.innerWidth, window.innerHeight);

const rtWidth = 512;
const rtHeight = 512;
const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, { stencilBuffer: false, });
const renderTarget2 = new THREE.WebGLRenderTarget(rtWidth, rtHeight, { stencilBuffer: false, });
const renderTarget3 = new THREE.WebGLRenderTarget(rtWidth, rtHeight, { stencilBuffer: false, });

const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        console.log(Math.round(percentComplete, 2) + '% downloaded');
    }
};

const onError = function (error) { console.log(error) };

const urls = [px, nx, py, ny, pz, nz];
const carCube = new THREE.CubeTextureLoader().load(urls, () => { console.log('loaded texture') }, onProgress, onError);

const scene = new THREE.Scene();
scene.background = carCube;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 22;

const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 1.0 },
        resolution: { value: new THREE.Vector2() },
        normalTexture: { value: renderTarget.texture },
        shaderTexture: { value: renderTarget2.texture },
        cameraMatrixInverse: { value: camera.matrixWorldInverse },
        eyeDirection: { value: new THREE.Vector3() },
        envMap: { value: carCube },
        resolution: { value: new THREE.Vector2(1.0, 1.0) },
        roughness: { value: 0.2 },
        toneColor: { value: new THREE.Color(0.2, 0.2, 0.9) },
        fresnelPower: { value: 0.1 },
        fogPower: { value: 0.4 },
        colorPower: { value: 0.4 },
    },
    vertexShader: vertexShaderBla,
    fragmentShader: fragmentCode,
    transparent: true,
});

const materialNormal = new THREE.MeshNormalMaterial({ transparent: true });
const materialShader = new THREE.ShaderMaterial({
    vertexShader: vertexShaderBlaMaterial,
    fragmentShader: fragmentCodeMaterial,
    transparent: true,
});

const fxaaMaterial = new THREE.ShaderMaterial({ ...FXAAShader });
const fxaaPass = new Pass.FullScreenQuad(fxaaMaterial);
fxaaPass.material.uniforms.tDiffuse.value = renderTarget3.texture;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.update();



loadObject();

onWindowResize();
window.addEventListener('resize', onWindowResize);


createGui();


function loadObject() {
    const manager = new THREE.LoadingManager();

    new MTLLoader(manager)
        .setPath('')
        .load(bunnyMtl, function (materials) {
            console.log('loaded mtl');
            materials.preload();
            new OBJLoader(manager)
                .setMaterials(materials)
                .setPath('')
                .load(bunnyObj, function (object) {

                    object.traverse(obj => {
                        if (obj.isMesh) {
                            obj.material = material;
                            obj.scale.set(150.0, 150.0, 150.0);
                            obj.position.set(0, -5, 0);
                            scene.add(obj);
                            animate();
                        }
                    });

                }, onProgress, onError);

        }, onProgress, onError);

};

function createGui() {
    const gui = new dat.GUI();

    const params = {
        'tone color': material.uniforms.toneColor.value.getHex(),
        'roughness': material.uniforms.roughness.value,
        'fresnel power': material.uniforms.fresnelPower.value,
        'fog power': material.uniforms.fogPower.value,
        'color power': material.uniforms.colorPower.value,
    };

    gui.addColor(params, 'tone color').onChange((val) => { material.uniforms.toneColor.value.setHex(val); });
    gui.add(params, 'roughness').min(0).max(1).step(0.01).onChange((val) => { material.uniforms.roughness.value = val; });
    gui.add(params, 'fresnel power', 0, 1, 0.01).onChange((val) => { material.uniforms.fresnelPower.value = val; });
    gui.add(params, 'fog power', 0, 1, 0.01).onChange((val) => { material.uniforms.fogPower.value = val; });
    gui.add(params, 'color power', 0, 1, 0.01).onChange((val) => { material.uniforms.colorPower.value = val; });

    gui.open();
};

function animate() {
    camera.getWorldDirection(material.uniforms.eyeDirection.value);
    const oldBackground = scene.background;
    scene.background = null;

    renderer.setRenderTarget(renderTarget);
    scene.overrideMaterial = materialNormal;
    renderer.render(scene, camera);

    renderer.setRenderTarget(renderTarget2);
    scene.overrideMaterial = materialShader;
    renderer.render(scene, camera);

    scene.background = oldBackground;

    renderer.setRenderTarget(renderTarget3);
    scene.overrideMaterial = null;
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    fxaaPass.render(renderer);

    requestAnimationFrame(animate);
};

function onWindowResize() {
    renderer.setSize(div.clientWidth, div.clientHeight);
    // renderer.setSize(window.innerWidth, window.innerHeight);
    

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderTarget.setSize(canvas.width, canvas.height);
    renderTarget2.setSize(canvas.width, canvas.height);
    renderTarget3.setSize(canvas.width, canvas.height);

    material.uniforms.resolution.value.set(canvas.width, canvas.height);
    fxaaPass.material.uniforms.resolution.value.set(1.0 / window.innerWidth, 1.0 / window.innerHeight);
};
