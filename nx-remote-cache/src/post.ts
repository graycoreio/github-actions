import * as core from '@actions/core';

import { cleanup } from './cleanup';
import { LOG_STATE, PID_STATE } from './configure';
import { processLauncher } from './process';

cleanup({ pid: core.getState(PID_STATE), logFile: core.getState(LOG_STATE) }, processLauncher);
