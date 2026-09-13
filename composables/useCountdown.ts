export function useCountdown(target: Ref<number>) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  const secondsLeft = computed(() => Math.max(0, Math.ceil((target.value - now.value) / 1000)))

  return { secondsLeft }
}
