import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layout/MainLayout.vue'
import { apiCurrentUser } from '../api/backend'
import { readToken } from '../api/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/courses',
      children: [
        {
          path: 'courses',
          name: 'Courses',
          component: () => import('../views/Courses.vue'),
          meta: {
            title: '课程管理',
            showSidebar: true
          }
        },
        {
          path: 'clubs',
          name: 'Clubs',
          component: () => import('../views/Clubs.vue'),
          meta: {
            title: '社团管理',
            showSidebar: true
          }
        },
        {
          path: 'enrollment',
          name: 'Enrollment',
          component: () => import('../views/Enrollment.vue'),
          meta: {
            title: '选课记录',
            showSidebar: true
          }
        },
        {
          path: 'account',
          name: 'AccountCenter',
          component: () => import('../views/AccountCenter.vue'),
          meta: {
            title: '个人中心',
            showSidebar: false,
            requiresAuth: true
          }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/courses'
    }
  ]
})

router.beforeEach(async (to) => {
  if (!to.meta?.requiresAuth) {
    return true
  }

  try {
    const token = readToken()

    if (!token) {
      return { path: '/courses', replace: true }
    }

    const user = await apiCurrentUser(token)

    if (user) {
      return true
    }

    return { path: '/courses', replace: true }
  } catch {
    return { path: '/courses', replace: true }
  }
})

export default router