<template>
  <div class="tool-ticker" v-if="toolEvents.length" ref="tickerEl">
    <div class="ticker-track" ref="trackEl">
      <div
        v-for="evt in toolEvents"
        :key="evt.call_id"
        class="ticker-chip"
        :class="chipClass(getStatus(evt))"
        :title="chipTitle(evt)"
      >
        <span class="chip-icon">{{ statusIcon(getStatus(evt)) }}</span>
        <span class="chip-name">{{ evt.tool_name || 'tool' }}</span>
        <span class="chip-duration" v-if="evt.duration_ms != null">
          {{ formatDuration(evt.duration_ms) }}
        </span>
        <span class="chip-spinner" v-if="getStatus(evt) === 'running'">
          <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ToolTicker',
  props: {
    toolEvents: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    getStatus(evt) {
      if (evt.status && ['success', 'warning', 'error', 'running'].includes(evt.status)) {
        return evt.status;
      }
      if (evt.ok === true) return 'success';
      if (evt.ok === false) return 'error';
      return 'running';
    },
    statusIcon(status) {
      switch (status) {
        case 'success': return '\u2705';
        case 'warning': return '\u26A0\uFE0F';
        case 'error':   return '\u274C';
        default:        return '\u{1F527}';
      }
    },
    chipClass(status) {
      switch (status) {
        case 'success': return 'chip-ok';
        case 'warning': return 'chip-warn';
        case 'error':   return 'chip-err';
        default:        return 'chip-running';
      }
    },
    chipTitle(evt) {
      const status = this.getStatus(evt);
      const parts = [evt.tool_name || 'tool'];
      if (evt.summary && evt.summary !== evt.tool_name) {
        parts.push(`- ${evt.summary}`);
      }
      if (evt.duration_ms != null) {
        parts.push(`(${this.formatDuration(evt.duration_ms)})`);
      }
      parts.push(`[${status}]`);
      return parts.join(' ');
    },
    formatDuration(ms) {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`;
      return `${Math.round(ms / 1000)}s`;
    },
    scrollToEnd() {
      this.$nextTick(() => {
        const track = this.$refs.trackEl;
        if (track) {
          track.scrollLeft = track.scrollWidth;
        }
      });
    },
  },
  watch: {
    toolEvents: {
      handler() {
        this.scrollToEnd();
      },
      deep: false,
    },
  },
  mounted() {
    this.scrollToEnd();
  },
};
</script>

<style scoped>
.tool-ticker {
  margin: 0 12px 4px 12px;
  background: var(--surface-ground, #f8f9fa);
  border: 1px solid var(--surface-border, #d3d3d3);
  border-radius: 6px;
  overflow: hidden;
  user-select: none;
}

.ticker-track {
  display: flex;
  gap: 6px;
  padding: 5px 8px;
  overflow-x: auto;
  scroll-behavior: smooth;
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ticker-track::-webkit-scrollbar {
  display: none;
}

.ticker-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 14px;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.78rem;
  border: 1px solid transparent;
  transition: background 0.2s, border-color 0.2s;
}

/* --- chip states --- */
.chip-running {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.chip-ok {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}
.chip-warn {
  background: #fffbeb;
  border-color: #fcd34d;
  color: #92400e;
}
.chip-err {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #991b1b;
}

.chip-icon {
  flex-shrink: 0;
  font-size: 0.85rem;
  line-height: 1;
}

.chip-name {
  font-weight: 600;
}

.chip-duration {
  opacity: 0.7;
  font-size: 0.72rem;
}

/* Running spinner */
.chip-spinner {
  margin-left: 1px;
}
.chip-spinner .dot {
  animation: ticker-blink 1.4s infinite both;
  font-weight: bold;
  color: #1d4ed8;
}
.chip-spinner .dot:nth-child(2) { animation-delay: 0.2s; }
.chip-spinner .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes ticker-blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}
</style>
