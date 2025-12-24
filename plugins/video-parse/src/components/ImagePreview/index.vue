<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import showToast from '../../utils/toast';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  list: {
    type: Array,
    default: () => []
  },
  type: {
    type: String,
    default: 'cover' // cover pic video live
  },
  current: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits([
  'open',
  'close',
  'next',
  'prev',
])

const rotation = ref(0);
const mirror = ref(false);
const scale = ref(1);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const imageX = ref(0);
const imageY = ref(0);

const closePreview = () => {
  emit('close');
  rotation.value = 0;
  mirror.value = false;
  scale.value = 1;
  imageX.value = 0;
  imageY.value = 0;
}

const prevImage = () => {
  const { current, list } = props;
  const currentImageIndex = current > 0 ? current - 1 : list.length - 1;
  emit('prev', currentImageIndex);
  imageX.value = 0;
  imageY.value = 0;
}

const nextImage = () => {
  const { current, list } = props;
  const currentImageIndex = current < list.length - 1 ? current + 1 : 0;
  emit('next', currentImageIndex);
  imageX.value = 0;
  imageY.value = 0;
}

const rotateImage = () => {
  rotation.value += 90;
}

const mirrorImage = () => {
  mirror.value = !mirror.value;
}

const handleWheel = (event) => {
  if (!props.visible) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  scale.value = Math.max(0.1, Math.min(3, scale.value + delta));
}

const startDrag = (event) => {
  if (!props.visible) return;
  isDragging.value = true;
  dragStartX.value = event.clientX - imageX.value;
  dragStartY.value = event.clientY - imageY.value;
  event.preventDefault();
}

const drag = (event) => {
  if (!isDragging.value || !props.visible) return;
  imageX.value = event.clientX - dragStartX.value;
  imageY.value = event.clientY - dragStartY.value;
}

const stopDrag = () => {
  isDragging.value = false;
}

const handleKeydown = (event) => {
  if (!props.visible) return;
  if (event.key === 'ArrowLeft') {
    prevImage();
  } else if (event.key === 'ArrowRight') {
    nextImage();
  } else if (event.key === 'Escape') {
    closePreview();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
})

// 下载加载
const loading = ref(false);

const download = async () => {
  let url;
  let type = props.type === 'live' ? 'video' : (props.type === 'video' ? 'video' : 'pic');
  loading.value = true;
  url = props.list[props.current];
  try {
    const res = await window.services.downloadVideo(url, type);
    console.log(res);
    if (res) {
      window.utools.shellShowItemInFolder(res);
      showToast('下载成功');
      loading.value = false;
    } else {
      showToast('下载失败', 'error');
      loading.value = false;
    }
  } catch(e) {
    showToast('下载失败' + e.message, 'error');
    loading.value = false;
  }
}

const copyLink = (url) => {
  navigator.clipboard.writeText(url);
  showToast('已复制到剪贴板');
}

const playLivePhoto = async () => { 
  const video = document.getElementById('livePhoto');
  if (video) {
    video.play();
  }
}
</script>
<template>
  <div v-if="visible" class="modal" @click="closePreview">
    <div class="modal-content" @click.stop @wheel="handleWheel">
      <!-- pic cover -->
      <img v-if="type === 'pic' || type === 'cover'" :src="list[current]" alt="预览" class="preview-img" :style="{ transform: `translate(${imageX}px, ${imageY}px) scale(${scale}) rotate(${rotation}deg) scaleX(${mirror ? -1 : 1})`, transition: isDragging ? 'none' : 'transform .3s' }" @mousedown="startDrag" @mousemove="drag" @mouseup="stopDrag" @mouseleave="stopDrag">
      <!-- live -->
      <video v-if="type === 'live'" id="livePhoto" :src="list[current]" alt="预览" />
      <div v-if="type === 'live'" class="live-control" @click.stop="playLivePhoto">
        Live
      </div>
      <!-- video -->
      <video v-if="type === 'video'" :src="list[current]" alt="预览" class="preview-img preview-video" controls :style="{ transform: `translate(${imageX}px, ${imageY}px) scale(${scale}) rotate(${rotation}deg) scaleX(${mirror ? -1 : 1})`, transition: isDragging ? 'none' : 'transform .3s' }" @mousedown="startDrag" @mousemove="drag" @mouseup="stopDrag" @mouseleave="stopDrag" />
      <button class="close-btn" @click="closePreview">×</button>
      <button v-if="list.length > 1" class="nav-btn prev-btn" @click="prevImage">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <button v-if="list.length > 1" class="nav-btn next-btn" @click="nextImage">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
      <div class="image-index" v-if="list.length > 1">
        {{ current + 1 + ' / ' + list.length }}
      </div>
      <!-- 工具条 -->
      <div class="toolbar">
        <button class="tool-btn" @click="rotateImage" title="旋转">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
        <button class="tool-btn" @click="mirrorImage" title="镜像">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="14" x="2" y="3" rx="2"/>
            <line x1="2" x2="22" y1="9" y2="9"/>
          </svg>
        </button>
        <button class="tool-btn" @click="copyLink(list[current])" title="复制">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
        <button class="tool-btn" :disabled="loading" @click="download()" title="下载">
          <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          <svg v-else t="1765683055654" class="icon loading" viewBox="0 0 1024 1024" fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12849" width="15" height="15"><path d="M469.333333 128a42.666667 42.666667 0 0 1 42.666667-42.666667c235.648 0 426.666667 191.018667 426.666667 426.666667a42.666667 42.666667 0 1 1-85.333334 0 341.333333 341.333333 0 0 0-341.333333-341.333333 42.666667 42.666667 0 0 1-42.666667-42.666667z" p-id="12850"></path></svg>
        </button>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  // max-width: 90%;
  // max-height: 90%;
}

.preview-img {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 5px;
  object-fit: contain;
}

.preview-video {
  max-width: 90vw;
  max-height: 90vh;
}

.close-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 35px;
  height: 35px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s;
}

.nav-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 35px;
  height: 35px;
  // background-color: rgba(255, 255, 255, 0.8);
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 30px;
  transition: background-color 0.3s;
  z-index: 1001;
}

.nav-btn:hover, .close-btn:hover {
  background-color: rgba(0, 0, 0, 1);
}

.prev-btn {
  left: 20px;
}

.next-btn {
  right: 20px;
}

.image-index {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 5px 10px;
  border-radius: 5px;
}

.toolbar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 1001;
}

.tool-btn {
  width: 35px;
  height: 35px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s;
}

.tool-btn:hover {
  background-color: rgba(0, 0, 0, 1);
}

.tool-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.live-control {
  position: absolute;
  top: 5px;
  left: 5px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px 15px;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;
}

</style>
