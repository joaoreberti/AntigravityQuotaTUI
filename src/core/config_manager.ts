/**
 * Config Manager Service
 */

import {config_options} from '../utils/types.js';

export class ConfigManager {
	/**
	 * Get full config from environment variables or defaults
	 */
	get_config(): config_options {
		return {
			enabled: process.env.AGQ_ENABLED !== 'false',
			polling_interval: Math.max(30, parseInt(process.env.AGQ_POLLING_INTERVAL || '120', 10)) * 1000,
			show_prompt_credits: process.env.AGQ_SHOW_CREDITS === 'true',
		};
	}

	/**
	 * Placeholder for config changes (not used in TUI for now)
	 */
	on_config_change(callback: (config: config_options) => void) {
		// In a CLI app, we could watch a config file, 
		// but for now we'll just return a no-op cleanup function
		return { dispose: () => {} };
	}
}
