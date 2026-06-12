import * as THREE from 'three'

const app = document.getElementById('app')!
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 3

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial(),
)
scene.add(cube)

function frame(): void {
  cube.rotation.x += 0.01
  cube.rotation.y += 0.013
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}
frame()
