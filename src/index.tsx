import React, {useState, useEffect} from 'react';
import {render, Text, Box, useInput, useApp} from 'ink';
import {ProcessFinder} from './core/process_finder.js';
import {QuotaManager} from './core/quota_manager.js';
import {ConfigManager} from './core/config_manager.js';
import {quota_snapshot} from './utils/types.js';
import {logger} from './utils/logger.js';
import {program} from 'commander';

program
  .name('agq')
  .description('Antigravity Quota Monitor')
  .version('2.0.0')
  .option('-i, --interval <number>', 'polling interval in seconds', '120')
  .parse(process.argv);

const options = program.opts();

// Instantiate services outside the component to persist them across re-renders
const configManager = new ConfigManager();
const processFinder = new ProcessFinder();
const quotaManager = new QuotaManager();

const App = () => {
  const {exit} = useApp();
  const [snapshot, setSnapshot] = useState<quota_snapshot | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const start = async () => {
    setError(null);
    setStatus('Searching for Antigravity process...');
    const info = await processFinder.detect_process_info(3);
    
    if (!info) {
      setError('Could not find Antigravity process. Is the IDE running?');
      setStatus('Waiting');
      return;
    }

    setStatus('Connected');
    quotaManager.init(info.connect_port, info.csrf_token);
    
    quotaManager.on_update((s) => {
      setSnapshot(s);
      setLastUpdate(new Date());
      setStatus('Connected');
    });

    quotaManager.on_error((e) => {
      logger.error('App', `Quota fetch error: ${e.message}`);
      setError(`Fetch Error: ${e.message}`);
    });

    const interval = parseInt(options.interval, 10) * 1000;
    quotaManager.start_polling(interval);
  };

  useEffect(() => {
    logger.init();
    start();

    return () => {
      quotaManager.stop_polling();
    };
  }, []);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    if (input === 'r') {
      setError(null);
      setStatus('Refreshing...');
      if (quotaManager.is_initialized()) {
        quotaManager.fetch_quota().then(() => setStatus('Connected'));
      } else {
        start();
      }
    }
  });

  const renderProgressBar = (percentage: number) => {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    let color = 'green';
    if (percentage < 10) color = 'red';
    else if (percentage < 50) color = 'yellow';

    return (
      <Text>
        <Text color={color}>{'█'.repeat(filled)}</Text>
        <Text color="gray">{'░'.repeat(empty)}</Text>
        {` ${percentage.toFixed(1)}%`}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
      <Box marginBottom={1}>
        <Text bold color="cyan">AGQ - Antigravity Quota Monitor</Text>
        <Box flexGrow={1} />
        <Text color={error ? 'red' : 'green'}>{status}</Text>
      </Box>

      {error && (
        <Box marginBottom={1} borderStyle="single" borderColor="red" paddingX={1} flexDirection="column">
          <Text color="red">Status: {error}</Text>
          <Text color="gray">Make sure Antigravity is open and try refreshing [r]</Text>
        </Box>
      )}

      {snapshot?.prompt_credits && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline>Prompt Credits</Text>
          <Box marginLeft={2}>
            {renderProgressBar(snapshot.prompt_credits.remaining_percentage)}
            <Text color="gray"> ({snapshot.prompt_credits.available} / {snapshot.prompt_credits.monthly})</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column">
        <Text bold underline>Model Quotas</Text>
        {snapshot?.models.map((model, index) => (
          <Box key={index} marginLeft={2} flexDirection="column" marginTop={index === 0 ? 0 : 1}>
            <Box>
              <Text bold>{model.label}</Text>
              <Box flexGrow={1} />
              <Text color="gray">{model.time_until_reset_formatted}</Text>
            </Box>
            <Box>
              {renderProgressBar(model.remaining_percentage ?? 0)}
            </Box>
          </Box>
        ))}
        {(!snapshot || snapshot.models.length === 0) && !error && (
          <Box marginLeft={2}>
            <Text color="gray" italic>No models found or loading...</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} borderStyle="single" borderTop={true} borderBottom={false} borderLeft={false} borderRight={false} paddingTop={1}>
        <Text color="gray">
          [r] Refresh/Reconnect | [q] Quit | Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </Text>
      </Box>
    </Box>
  );
};

render(<App />);
