import { ref } from 'vue'

export function useFavoriteDialog() {
  const favoriteDialog = ref({
    show: false,
    remark: '',
    item: null
  })

  const openFavoriteDialog = (item) => {
    favoriteDialog.value = {
      show: true,
      remark: '',
      item: item
    }
  }

  /**
   * 确认收藏
   * @param {Function} addFn - 添加收藏的函数 (item, remark) => Promise
   */
  const confirmFavorite = async (addFn) => {
    if (!favoriteDialog.value.item) return
    await addFn(favoriteDialog.value.item, favoriteDialog.value.remark)
    favoriteDialog.value.show = false
    favoriteDialog.value.remark = ''
    favoriteDialog.value.item = null
  }

  const cancelFavoriteDialog = () => {
    favoriteDialog.value.show = false
    favoriteDialog.value.remark = ''
    favoriteDialog.value.item = null
  }

  return {
    favoriteDialog,
    openFavoriteDialog,
    confirmFavorite,
    cancelFavoriteDialog
  }
}
