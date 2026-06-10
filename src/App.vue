<script setup lang="ts">
// App 根组件，仅负责挂载路由视图
</script>

<template>
  <router-view />
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  height: 100%;
  font-family: 'Inter', 'Helvetica Neue', Helvetica, 'PingFang SC',
    'Microsoft YaHei', sans-serif;
  background: #f5f7fb;
  color: #1f2937;
}
</style>