<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Dialog from '../components/Dialog/index.vue';
import Preference from '../components/Preference/index.vue';

defineProps({
  enterAction: {
    type: Object,
    default: () => ({})
  }
})

const currentTab = ref('video') // 默认显示视频

const content = ref('');

const detailInfo = ref(null);
const loading = ref(false);

const previewImage = ref('');
const showPreview = ref(false);
const currentImageIndex = ref(0);
const showPrevNext = ref(false);
const rotation = ref(0);
const mirror = ref(false);
const scale = ref(1);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const imageX = ref(0);
const imageY = ref(0);
const toast = ref({ show: false, message: '', type: 'info' });
const switchTab = (tab) => {
  currentTab.value = tab
}

const openPreview = (index) => {
  currentImageIndex.value = index;
  previewImage.value = detailInfo.value.pics[index].url;
  showPreview.value = true;
  showPrevNext.value = detailInfo.value.pics.length > 1;
  rotation.value = 0;
  mirror.value = false;
  scale.value = 1;
  imageX.value = 0;
  imageY.value = 0;
}

const openPreviewCover = (url) => {
  previewImage.value = url;
  showPreview.value = true;
  showPrevNext.value = false;
  rotation.value = 0;
  mirror.value = false;
  scale.value = 1;
  imageX.value = 0;
  imageY.value = 0;
}

const closePreview = () => {
  showPreview.value = false;
  previewImage.value = '';
  currentImageIndex.value = 0;
  rotation.value = 0;
  mirror.value = false;
  scale.value = 1;
  imageX.value = 0;
  imageY.value = 0;
}

const prevImage = () => {
  currentImageIndex.value = currentImageIndex.value > 0 ? currentImageIndex.value - 1 : detailInfo.value.pics.length - 1;
  previewImage.value = detailInfo.value.pics[currentImageIndex.value].url;
  imageX.value = 0;
  imageY.value = 0;
}

const nextImage = () => {
  currentImageIndex.value = currentImageIndex.value < detailInfo.value.pics.length - 1 ? currentImageIndex.value + 1 : 0;
  previewImage.value = detailInfo.value.pics[currentImageIndex.value].url;
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
  if (!showPreview.value) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  scale.value = Math.max(0.1, Math.min(3, scale.value + delta));
}

const startDrag = (event) => {
  if (!showPreview.value) return;
  isDragging.value = true;
  dragStartX.value = event.clientX - imageX.value;
  dragStartY.value = event.clientY - imageY.value;
  event.preventDefault();
}

const drag = (event) => {
  if (!isDragging.value || !showPreview.value) return;
  imageX.value = event.clientX - dragStartX.value;
  imageY.value = event.clientY - dragStartY.value;
}

const stopDrag = () => {
  isDragging.value = false;
}

const handleKeydown = (event) => {
  if (!showPreview.value) return;
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

const platformList = [
  {
    id: 'douyin',
    name: '抖音',
    content: '1.53 L@J.II 08/21 TlP:/ 📍changsha长沙 “湘江北去，橘子洲头”# 旅行推荐官 # 长沙 # 橘子洲头  https://v.douyin.com/6Spq1X9ay0o/ 复制此链接，打开Dou音搜索，直接观看视频！',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    content: '估计后面会搓个手书吧 @RURU_茹. http://xhslink.com/o/9JV5cmmuOzg 复制后打开【小红书】查看笔记！【PS: 给妹妹个引流🐒】'
  },
  {
    id: 'jimeng',
    name: '即梦',
    content: 'https://jimeng.jianying.com/s/59q6OoJtnok/'
  },
  {
    id: 'zuiyou',
    name: '最右',
    content: '#最右#分享一条有趣的内容给你，不好看算我输。请戳链接>>https://share.xiaochuankeji.cn/hybrid/share/post?pid=413110582'
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩',
    content: '【淀粉肠包蛋 暂时不考虑收徒】 https://www.bilibili.com/video/BV1HD27BNETV/?share_source=copy_web&vd_source=78607971dc08a56a924ddc1a0786ef5f'
  }
]

const parseInfo = async () => {
  if (!content.value) return;
  // 解析出content中的url
  const url = content.value.match(/http[s]?:\/\/[^\s]+/)[0];
  console.log(url);
  if (!url) return;
  loading.value = true;
  try {
    const info = await window.services.parseInfo(url);
    console.log(info);
    detailInfo.value = info;
    currentTab.value = info.downloadUrl ? 'video' : 'pic';
    loading.value = false;
    setHistory(content.value, info);
  } catch (e) {
    console.log(e.message);
    loading.value = false;
    showError(e.message);
  }
}

const MAX_HISTORY = 50;

const setHistory = (content, info) => {
  let list = window.utools.dbStorage.getItem('history') || [];
  // content 去重
  list = list.filter(item => item.content !== content);
  // 新的放最前
  list.unshift({
    content: content,
    data: info,
    time: new Date().toLocaleString()
  });
  if (list.length > MAX_HISTORY) {
    list = list.slice(0, MAX_HISTORY);
  }
  window.utools.dbStorage.setItem('history', list);
}

const showError = (message) => {
  showToast(message, 'error');
}

const copyLink = (livePhoto) => {
  // TODO 暂时不考虑livePhoto
  if (livePhoto) {
    copyText(livePhoto);
  } else {
    copyText(previewImage.value);
  }
  showToast('已复制到剪贴板');
}

const copyText = (text) => {
  navigator.clipboard.writeText(text);
  showToast('已复制到剪贴板');
}

const testPlatform = (index) => { 
  content.value = platformList[index].content;
}

const playLivePhoto = (index) => {
  document.querySelector('#livePhoto' + index).play();
}

// 下载加载
const picLoading = ref(false);
const livePhotoLoading = ref(false);

const download = async (livePhoto) => {
  let url;
  let type = livePhoto ? 'video' : 'pic';
  if (livePhoto) {
    livePhotoLoading.value = true;
    url = livePhoto;
  } else {
    picLoading.value = true;
    url = previewImage.value;
  }
  const res = await window.services.downloadVideo(url, type);
  console.log(res);
  if (res) {
    window.utools.shellShowItemInFolder(res);
    showToast('下载成功');
    if (livePhoto) {
      livePhotoLoading.value = false;
    } else {
      picLoading.value = false;
    }
  } else {
    showToast('下载失败', 'error');
    if (livePhoto) {
      livePhotoLoading.value = false;
    } else {
      picLoading.value = false;
    }
  }
}

const showToast = (message, type = 'info') => {
  toast.value.show = true;
  toast.value.message = message;
  toast.value.type = type;
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

const copyAuthorUrl = () => {
  const platform = detailInfo.value.platform;
  if (platform !== 'default') {
    if (platform === 'xiaohongshu') {
      navigator.clipboard.writeText('https://www.xiaohongshu.com/user/profile/' + detailInfo.value.author.id);
      showToast('已复制到剪贴板');
    }
  }
}

const showDialog = ref(false);

const handlerLoadData = (e) => {
  const { content: ctx, data } = e;
  detailInfo.value = data;
  currentTab.value = data.downloadUrl ? 'video' : 'pic';
  content.value = ctx;
  showDialog.value = false;
}
</script>
<template>
  <div class="main">
    <div class="main-card">
      <div class="left">
        <div class="main-card-title">
          轻溪去水印
        </div>
        <!-- 声明 -->
        <div class="main-card-desc">本工具仅用于学习交流，请勿用于商业用途。</div>
        <textarea v-model="content" name="ipt" id="input" placeholder="在此粘贴视频分享链接..." @keydown.enter.prevent="parseInfo"></textarea>
        <button class="parse-btn" :disabled="loading" @click="parseInfo">
          <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search w-4 h-4" aria-hidden="true"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
          <svg v-else t="1765683055654" class="icon loading" viewBox="0 0 1024 1024" fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12849" width="15" height="15"><path d="M469.333333 128a42.666667 42.666667 0 0 1 42.666667-42.666667c235.648 0 426.666667 191.018667 426.666667 426.666667a42.666667 42.666667 0 1 1-85.333334 0 341.333333 341.333333 0 0 0-341.333333-341.333333 42.666667 42.666667 0 0 1-42.666667-42.666667z" p-id="12850"></path></svg>
          {{ loading ? '解析中...' : '开始解析' }}
        </button>
        <div class="platform">
          <div v-for="(item, index) in platformList" :key="index" class="platform-item" @click="testPlatform(index)">
            {{ item.name }}
          </div>
        </div>
        <div class="parse-info" v-if="detailInfo">
          <!-- 头像、名字 -->
          <div class="user-info">
            <img v-if="detailInfo?.author?.avatar" class="avatar" :src="detailInfo?.author?.avatar" alt="头像"></img>
            <div class="released-info-item-name">{{ detailInfo?.author?.name }}</div>
            <!-- 复制 -->
            <div class="copy-icon" v-if="detailInfo?.platform !== 'default'" title="复制作者主页链接" @click="copyAuthorUrl">
              <svg xmlns="http://www.w3.org/2000/svg"  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </div>
          </div>
          <!-- 文案 -->
          <div class="title-text">
            {{ detailInfo.title }}
            <span style="cursor: pointer;" title="复制文案" @click="copyText(detailInfo.title)">
              <svg xmlns="http://www.w3.org/2000/svg"  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </span>
          </div>
        </div>
        <button class="setting-btn" @click="showDialog = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings w-5 h-5" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
      <div class="right">
        <div class="detail-info" v-if="detailInfo">
          <div v-show="currentTab === 'video'" class="video-wrapper">
            <video v-if="detailInfo.downloadUrl" class="video" controls :src="detailInfo.downloadUrl"></video>
          </div>
          <div v-show="currentTab === 'pic'" class="pic-list">
            <div class="pic-item-wrapper" v-for="(item, index) in detailInfo.pics" :key="index">
              <video v-if="item.livePhotoUrl" autoplay :id="'livePhoto' + index" class="pic-item video-item" :src="item.livePhotoUrl"></video>
              <img v-else class="pic-item" :src="item.url" alt="图集" @click="openPreview(index)">
              <div class="live-photo-tip" v-if="item.livePhotoUrl" @click="playLivePhoto(index)">
                Live
              </div>
              <!-- 保存、复制 -->
              <div v-if="item.livePhotoUrl" class="save-and-copy">
                <div class="save-btn" @click="download(item.livePhotoUrl)">保存</div>
                <div class="copy-btn" @click="copyLink(item.livePhotoUrl)">复制</div>
              </div>
            </div>
          </div>
          <!-- 封面 -->
          <img v-show="currentTab === 'cover'" class="cover" :src="detailInfo.cover" alt="封面" @click="openPreviewCover(detailInfo.cover)"></img>
        </div>
        <div class="right-tip" v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play w-10 h-10 mb-2 opacity-20" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          预览区域
        </div>
        <div class="tab" v-if="detailInfo">
          <div class="tab-item" v-if="detailInfo.downloadUrl" :class="{ active: currentTab === 'video' }" @click="switchTab('video')">视频预览</div>
          <div class="tab-item" v-if="detailInfo.pics && detailInfo.pics.length !== 0" :class="{ active: currentTab === 'pic' }" @click="switchTab('pic')">图片预览</div>
          <div class="tab-item" v-if="detailInfo.cover" :class="{ active: currentTab === 'cover' }" @click="switchTab('cover')">封面预览</div>
        </div>
        <!-- <div class="parse-tip">
          注意：频繁解析可能导致平台限制，建议合理使用。
        </div> -->
      </div>
    </div>
  </div>
  <!-- 图片预览模态框 -->
  <div v-if="showPreview" class="modal" @click="closePreview">
    <div class="modal-content" @click.stop @wheel="handleWheel">
      <img :src="previewImage" alt="预览" class="preview-img" :style="{ transform: `translate(${imageX}px, ${imageY}px) scale(${scale}) rotate(${rotation}deg) scaleX(${mirror ? -1 : 1})`, transition: isDragging ? 'none' : 'transform .3s' }" @mousedown="startDrag" @mousemove="drag" @mouseup="stopDrag" @mouseleave="stopDrag">
      <button class="close-btn" @click="closePreview">×</button>
      <button v-if="showPrevNext" class="nav-btn prev-btn" @click="prevImage">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <button v-if="showPrevNext" class="nav-btn next-btn" @click="nextImage">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </button>
      <div class="image-index" v-if="showPrevNext">
        {{ currentImageIndex + 1 + ' / ' + detailInfo.pics.length }}
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
        <button class="tool-btn" @click="copyLink()" title="复制">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
        <button class="tool-btn" :disabled="picLoading" @click="download()" title="下载">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
  <!-- Toast 提示 -->
  <transition name="toast">
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </transition>
  <Dialog width="360px" title="偏好" v-model:visible="showDialog" @confirm="showDialog = false" confirm-text="关闭">
    <Preference @load-data="handlerLoadData" />
  </Dialog>
</template>
<style lang="scss" scoped>
  $radius: 10px;
  $card-height: calc(100vh - 40px - 40px);
  .main {
    // width: 100%;
    height: calc(100vh - 40px);
    background-color: #F5F7FA;// #F9FAFB
    padding: 20px;
  }
  .main-card {
    // margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 5px;
    margin-bottom: 10px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    .left {
      width: 50%;
      height: $card-height;
      background-color: #fff;
      border-top-left-radius: $radius;
      border-bottom-left-radius: $radius;
      border-right: 1px solid #EBEEF5;
      padding: 20px;
      position: relative;

      .main-card-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .main-card-desc {
        font-size: 12px;
        color: #909399;
        margin-bottom: 12px;
      }

      .platform {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 5px 0;

        .platform-item {
          // width: 50px;
          // height: 50px;
          padding: 5px 10px;
          background-color: #fff;
          border-radius: 5px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .platform-item:hover {
          background-color: #F5F7FA;
        }
      }

      .parse-info {
        height: 200px;
        overflow: auto;

        .copy-icon {
          display: flex;
          cursor: pointer;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;

          .avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
          }
        }

        // .title-text {
        //   background-color: hotpink;
        // }
      }
    }
    .right {
      width: 50%;
      height: $card-height;
      background-color: #F5F7FA;
      border-top-right-radius: $radius;
      border-bottom-right-radius: $radius;
      padding: 20px;
      position: relative;
      overflow: hidden;

      .detail-info {
        height: 100%;
      }

      .right-tip {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: rgba(0, 0, 0, 0.5);
        gap: 10px;
      }
    }
  }
  #input {
    width: 100%;
    height: 120px;
    padding: 10px;
    box-sizing: border-box;
    background-color: #F9FAFB;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    font-size: 14px;
    transition: all .3s;
  }
  #input::-webkit-scrollbar {
    display: none;
  }
  #input:focus {
    border: 1px solid #1E293B;
    background-color: #fff;
    // 黑色阴影
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 1);
  }
  .parse-btn {
    width: 100%;
    height: 40px;
    background-color: #0F172A;
    color: #fff;
    border-radius: 5px;
    font-size: 15px;
    margin-top: 10px;
    transition: all .3s;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  .parse-btn:hover {
    background-color: #1E293B;
  }

  .parse-btn:disabled { 
    background-color: #1E293B;
    cursor: not-allowed;
    color: rgba(255, 255, 255, 0.5);
  }

  .parse-btn:active {
    transform: scale(0.98);
  }

  .video-wrapper {
    width: 100%;
    height: 100%;
    .video {
      width: 100%;
      height: 100%;
      border-radius: 5px;
    }
  }

  .tab {
    width: 50%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    background-color: #fff;
    // padding: 5px;
    position: absolute;
    border-radius: 5px;
    top: 30px;
    left: 25%;

    .tab-item {
      width: 50%;
      height: 30px;
      border-radius: 5px;
      font-size: 14px;
      text-align: center;
      line-height: 30px;
      color: #1E293B;
      cursor: pointer;
      transition: all .3s;
      margin: 5px;
    }
    .active {
      background-color: #0F172A;
      color: #fff;
    }
  }

  .pic-list {
    height: calc($card-height - 80px);
    display: grid;
    grid-template-columns: repeat(auto-fill, 100px);
    gap: 10px;
    margin-top: 80px;
    overflow: auto;
    align-content: flex-start;
    .pic-item-wrapper {
      position: relative;

      .live-photo-tip {
        position: absolute;
        top: 2px;
        right: 2px;
        background-color: rgba(0, 0, 0, 1);
        border-radius: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #fff;
        padding: 2px 5px;
        font-size: 10px;
        cursor: pointer;
      }

      .video-item:hover {
        opacity: 1;
        cursor: auto;
      }

      .save-and-copy {
        width: 100%;
        position: absolute;
        bottom: 4px;
        left: 0;
        border-bottom-left-radius: 5px;
        border-bottom-right-radius: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 5px;
        // 从上到下渐变
        background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 100%);
        // background-color: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 12px;

        .save-btn, .copy-btn {
          padding: 2px 5px;
          cursor: pointer;
        }
      }
    }

    .pic-item {
      width: 100px;
      height: 100px;
      object-fit: cover;
      border-radius: 5px;
      transition: all .3s;
      cursor: pointer;
    }

    .pic-item:hover {
      opacity: 0.8;
    }
  }

  .cover {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 5px;
    margin-top: 80px;
    transition: all .3s;
    cursor: pointer;
  }

  .cover:hover {
    opacity: 0.8;
  }

  .loading {
    // 旋转
    animation: spin 0.5s linear infinite;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

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

  .setting-btn {
    background-color: transparent;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.3s;
    color: #94a3b8;
    position: absolute;
    top: 20px;
    right: 20px;
  }

  .setting-btn:hover {
    background-color: #e5e7eb;
    color: #2151D1;
  }

  .parse-tip {
    position: absolute;
    top: 2px;
    left: 20px;
    white-space: nowrap;
    color: #94a3b8;
    font-size: 10px;
  }
</style>

