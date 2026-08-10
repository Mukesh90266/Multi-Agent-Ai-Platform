const LOG_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Enhanced logger with timestamps and color coding for pipeline visibility
 */
const formatTimestamp = () => {
  const now = new Date();
  return now.toISOString().split('T')[1].split('.')[0];
};

export const logger = {
  info: (...args) => {
    console.log(`${LOG_COLORS.dim}[${formatTimestamp()}]${LOG_COLORS.reset}`, ...args);
  },
  
  phase: (label) => {
    console.log(`\n${LOG_COLORS.bright}${LOG_COLORS.cyan}[${formatTimestamp()}] ═══ ${label} ═══${LOG_COLORS.reset}\n`);
  },
  
  agent: (agent, status, details = '') => {
    const agentColors = {
      researcher: LOG_COLORS.blue,
      writer: LOG_COLORS.green,
      editor: LOG_COLORS.magenta,
      optimizer: LOG_COLORS.red
    };
    const color = agentColors[agent] || LOG_COLORS.white;
    const icon = status === 'started' ? '▶' : '✓';
    console.log(`${color}${icon} [${agent.toUpperCase()}]${LOG_COLORS.reset} ${status}${details ? ' - ' + details : ''}`);
  },
  
  iteration: (current, max, decision = '') => {
    console.log(`\n${LOG_COLORS.bright}${LOG_COLORS.cyan}⟳ Iteration ${current}/${max}${LOG_COLORS.reset}${decision ? ' - ' + decision : ''}\n`);
  },
  
  decision: (decision, score) => {
    const color = decision === 'approved' ? LOG_COLORS.green : LOG_COLORS.yellow;
    console.log(`\n${LOG_COLORS.bright}${color}▸ Decision: ${decision.toUpperCase()} (${score}/100)${LOG_COLORS.reset}\n`);
  },
  
  error: (...args) => {
    console.error(`${LOG_COLORS.red}[ERROR]${LOG_COLORS.reset}`, ...args);
  },
  
  success: (message) => {
    console.log(`${LOG_COLORS.green}✓${LOG_COLORS.reset} ${message}`);
  },
  
  warning: (message) => {
    console.log(`${LOG_COLORS.yellow}⚠${LOG_COLORS.reset} ${message}`);
  }
};
