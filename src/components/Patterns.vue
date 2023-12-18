<script setup lang="ts">
import { ref } from "vue";

defineProps<{ msg: string }>();
// try to get by without using pinia/a global store

const count = ref(0);

const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`
);
</script>

<template>
  <ScrollArea class="min-h-72 w-72 rounded-md border">
    <div class="p-4">
      <h4 class="mb-4 text-sm font-medium leading-none">Patterns</h4>

      <div v-for="tag in tags" :key="tag">
        <div class="text-sm baseFlex gap-2">
          {{ tag }}
          <Button class="!p-1">
            <v-icon name="bi-md-edit-note-round " scale="1" />
          </Button>
          <Button class="!p-1">
            <v-icon name="bi-md-deleteforever-round" scale="1" />
          </Button>
        </div>
        <Separator class="my-2" />
      </div>
    </div>
  </ScrollArea>
</template>
