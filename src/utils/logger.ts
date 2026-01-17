import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

class Logger {
	private log_level: LogLevel = LogLevel.DEBUG;
	private prefix = '[AGQ]';
	private log_file: string;

	constructor() {
		this.log_file = path.join(process.cwd(), 'agq.log');
	}

	init() {
		// Ensure log file exists or is cleared
		fs.writeFileSync(this.log_file, `--- AGQ Session Started at ${new Date().toISOString()} ---\n`);
	}

	set_level(level: LogLevel) {
		this.log_level = level;
	}

	private log(level: LogLevel, category: string, message: string, ...args: any[]) {
		if (level < this.log_level) return;

		const timestamp = new Date().toISOString();
		const level_str = LogLevel[level].padEnd(5);
		const formatted = `${timestamp} ${level_str} ${this.prefix}[${category}] ${message}`;

		let args_str = '';
		if (args.length > 0) {
			args_str = args
				.map(arg => {
					if (typeof arg === 'object') {
						try {
							return JSON.stringify(arg, null, 2);
						} catch {
							return String(arg);
						}
					}
					return String(arg);
				})
				.join(' ');
		}

		const full_message = `${formatted}${args_str ? ' ' + args_str : ''}\n`;

		// Always write to file
		try {
			fs.appendFileSync(this.log_file, full_message);
		} catch {
			// Ignore log write errors
		}

		// Only log to console if not in TUI mode (or if it's an error and we are not rendered yet)
		// For now, we'll rely on the log file for debugging the TUI itself.
	}

	debug(category: string, message: string, ...args: any[]) {
		this.log(LogLevel.DEBUG, category, message, ...args);
	}

	info(category: string, message: string, ...args: any[]) {
		this.log(LogLevel.INFO, category, message, ...args);
	}

	warn(category: string, message: string, ...args: any[]) {
		this.log(LogLevel.WARN, category, message, ...args);
	}

	error(category: string, message: string, ...args: any[]) {
		this.log(LogLevel.ERROR, category, message, ...args);
	}

	section(category: string, title: string) {
		const divider = '='.repeat(60);
		this.debug(category, divider);
		this.debug(category, title);
		this.debug(category, divider);
	}

	time_start(label: string): () => void {
		const start = Date.now();
		this.debug('PERF', `Timer started: ${label}`);
		return () => {
			const elapsed = Date.now() - start;
			this.debug('PERF', `Timer ended: ${label} (${elapsed}ms)`);
		};
	}
}

export const logger = new Logger();
