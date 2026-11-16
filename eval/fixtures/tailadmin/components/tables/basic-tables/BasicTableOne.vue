<template>
  <div
    class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <Table>
      <TableHeader>
        <TableRow is-header>
          <TableCell is-header class="w-3/11">User</TableCell>
          <TableCell is-header class="w-2/11">Project Name</TableCell>
          <TableCell is-header class="w-2/11">Team</TableCell>
          <TableCell is-header class="w-2/11">Status</TableCell>
          <TableCell is-header class="w-2/11">Budget</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(user, index) in users" :key="index">
          <TableCell>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 overflow-hidden rounded-full">
                <img :src="user.avatar" :alt="user.name" />
              </div>
              <div>
                <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ user.name }}
                </span>
                <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                  {{ user.role }}
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ user.project }}</p>
          </TableCell>
          <TableCell>
            <div class="flex -space-x-2">
              <div
                v-for="(member, memberIndex) in user.team"
                :key="memberIndex"
                class="w-6 h-6 overflow-hidden border-2 border-white rounded-full dark:border-gray-900"
              >
                <img :src="member" alt="team member" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <span
              :class="[
                'rounded-full px-2 py-0.5 text-theme-xs font-medium',
                {
                  'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500':
                    user.status === 'Active',
                  'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400':
                    user.status === 'Pending',
                  'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500':
                    user.status === 'Cancel',
                },
              ]"
            >
              {{ user.status }}
            </span>
          </TableCell>
          <TableCell>
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ user.budget }}</p>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<script lang="ts">
export interface TableOneUser {
  name: string
  role: string
  avatar: string
  project: string
  team: string[]
  status: 'Active' | 'Pending' | 'Cancel'
  budget: string
}

export const defaultTableOneUsers: TableOneUser[] = [
  {
    name: 'Lindsey Curtis',
    role: 'Web Designer',
    avatar: '/images/user/user-17.jpg',
    project: 'Agency Website',
    team: ['/images/user/user-22.jpg', '/images/user/user-23.jpg', '/images/user/user-24.jpg'],
    status: 'Active',
    budget: '3.9K',
  },
  {
    name: 'Kaiya George',
    role: 'Project Manager',
    avatar: '/images/user/user-18.jpg',
    project: 'Technology',
    team: ['/images/user/user-25.jpg', '/images/user/user-26.jpg'],
    status: 'Pending',
    budget: '24.9K',
  },
  {
    name: 'Zain Geidt',
    role: 'Content Writer',
    avatar: '/images/user/user-19.jpg',
    project: 'Blog Writing',
    team: ['/images/user/user-27.jpg'],
    status: 'Active',
    budget: '12.7K',
  },
  {
    name: 'Abram Schleifer',
    role: 'Digital Marketer',
    avatar: '/images/user/user-20.jpg',
    project: 'Social Media',
    team: ['/images/user/user-28.jpg', '/images/user/user-29.jpg', '/images/user/user-30.jpg'],
    status: 'Cancel',
    budget: '2.8K',
  },
  {
    name: 'Carla George',
    role: 'Front-end Developer',
    avatar: '/images/user/user-21.jpg',
    project: 'Website',
    team: ['/images/user/user-31.jpg', '/images/user/user-32.jpg', '/images/user/user-33.jpg'],
    status: 'Active',
    budget: '4.5K',
  },
]
</script>

<script setup lang="ts">
import Table from '../Table.vue'
import TableHeader from '../TableHeader.vue'
import TableBody from '../TableBody.vue'
import TableRow from '../TableRow.vue'
import TableCell from '../TableCell.vue'

const { users = defaultTableOneUsers } = defineProps<{
  users?: TableOneUser[]
}>()
</script>
