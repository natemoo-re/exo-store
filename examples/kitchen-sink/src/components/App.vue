<template>
    <h3>Hello from Vue!</h3>
    <pre ref="el" class="value" v-html="'vue: ' + count" />
    
    <button @click="add">+</button>
</template>

<script lang="ts">
import { defineComponent, ref, watch, unref } from 'vue'
import { set } from '@exo-store/core';
import { useStore } from '@exo-store/vue';
import MyStore from '../store';

export default defineComponent({
    setup() {
        const el = ref();
        const count = useStore(MyStore, v => v.vue);
        const add = () => set(count, v => v + 1);

        watch([el, count], () => {
            const div = unref(el);
            console.log(div);
            if (!div) return;
            div.classList.add('flash');
            setTimeout(() => div.classList.remove('flash'), 200);
        })


        return {
            el,
            count,
            add
        }
    }
})
</script>

