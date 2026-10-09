const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('../src/scripts/seed');
