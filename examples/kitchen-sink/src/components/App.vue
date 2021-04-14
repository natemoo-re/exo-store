<template>
    <h3>Shared</h3>
    <pre v-html="JSON.stringify(state, null, 2)" />
    
    <button @click="add">+</button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useStore } from '@exo-store/vue';
import MyStore from '../store';

export default defineComponent({
    setup() {
        const [state, store] = useStore(MyStore);
        const add = () => store.vue++;

        return {
            state,
            add
        }
    }
})
</script>
