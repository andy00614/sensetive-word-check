# Sensitive Word Detection System

A comprehensive content moderation system that combines local Chinese sensitive word detection with Azure Content Moderator for enhanced accuracy and multilingual support.

## 🔥 Key Features

- **🔍 Combined Detection**: Local + Azure Content Moderator hybrid approach
- **🌍 Multilingual**: Chinese-focused local detection + Azure's multilingual AI
- **⚡ Fast**: AhoCorasick algorithm for efficient string matching
- **🛡️ Comprehensive**: Political, violence, profanity, and racial content detection
- **🎯 Accurate**: Smart decision logic - if either system flags content, it's flagged

## 📁 Project Structure

```
├── src/
│   ├── core/                    # Core detection logic
│   │   ├── index.ts            # Main exports
│   │   ├── CombinedDetector.ts # Hybrid detection engine
│   │   ├── RealWorldDetector.ts # Local Chinese detection
│   │   ├── AzureModerator.ts   # Azure Content Safety wrapper
│   │   └── SensitiveWordLoader.ts # Word list management
│   ├── web/                    # Browser-compatible builds
│   │   └── index.ts
│   ├── api/                    # REST API server
│   │   ├── server.ts
│   │   └── routes.ts
│   ├── sdk/                    # Client SDK
│   │   └── client.ts
│   └── types/                  # TypeScript definitions
│       └── index.ts
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── data/                   # Test data
├── Sensitive-lexicon/          # Chinese word lists
├── dist/                       # Built artifacts
└── test-page.html             # Interactive demo page
```

## 🚀 Quick Start

### Installation
```bash
bun install
```

### Development
```bash
# Start development server
bun run dev

# Run tests
bun run test

# Type checking
bun run typecheck
```

### Building
```bash
# Build Node.js version
bun run build

# Build browser version
bun run build:web

# Build both versions
bun run build:all
```

### Demo
```bash
# Open interactive demo page
bun run demo
```

## 🔧 Configuration

### Azure Content Moderator Setup
1. Create an Azure Content Safety resource
2. Get your endpoint and subscription key
3. Configure in demo page or via environment variables

### Environment Variables
```bash
AZURE_CONTENT_SAFETY_ENDPOINT="your-endpoint"
AZURE_CONTENT_SAFETY_KEY="your-key"
```

## 🧪 Usage

### REST API Usage

Start the API server:
```bash
bun run dev
# API available at http://localhost:3000
```

Test with cURL:
```bash
# Basic detection
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "测试文本"}'

# Health check
curl http://localhost:3000/api/health
```

### SDK Usage

#### Node.js SDK
```typescript
import { createClient } from './src/sdk/client';

const client = createClient({
  baseURL: 'http://localhost:3000',
  defaultAzureConfig: {
    endpoint: 'your-azure-endpoint',
    subscriptionKey: 'your-key'
  }
});

// Basic detection
const result = await client.detect('测试文本');
console.log(result.result?.level); // 'safe' | 'warning' | 'forbidden'

// Batch detection
const results = await client.detectBatch([
  '安全文本',
  '你这个傻逼',
  'I hate you'
]);
```

#### Browser SDK
```html
<script src="./dist/sdk/client.browser.js"></script>
<script>
const client = new SensitiveWordClient({
  baseURL: 'http://localhost:3000'
});

client.detect('测试文本').then(result => {
  console.log('Detection level:', result.result?.level);
});
</script>
```

### Direct Library Usage
```typescript
import { CombinedDetector, SensitiveWordLoader } from 'sensitive-word-check';

const loader = new SensitiveWordLoader('./Sensitive-lexicon/Vocabulary');
loader.initialize();

const detector = new CombinedDetector(loader, {
  endpoint: 'your-azure-endpoint',
  subscriptionKey: 'your-key'
});

const result = await detector.detect('测试文本');
console.log(result.level); // 'safe' | 'warning' | 'forbidden'
```

### Decision Logic
The system uses a **strict OR approach**:
- If **local detection** flags as dangerous → Result: dangerous
- If **Azure detection** flags as dangerous → Result: dangerous
- If **both** flag as safe → Result: safe

This ensures maximum coverage and minimal false negatives.

## 📊 Available Scripts

### Development & Building
| Script | Description |
|--------|-------------|
| `bun run dev` | Start development API server |
| `bun run start` | Start production API server |
| `bun run build` | Build Node.js core library |
| `bun run build:web` | Build browser version |
| `bun run build:api` | Build API server |
| `bun run build:sdk` | Build Node.js & browser SDK |
| `bun run build:all` | Build all versions |

### Testing
| Script | Description |
|--------|-------------|
| `bun run test` | Run all tests |
| `bun run test:unit` | Run unit tests only |
| `bun run test:integration` | Run integration tests |
| `bun run test:quality` | Run quality evaluation |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:api` | Run API tests (TBD) |

### Development Tools
| Script | Description |
|--------|-------------|
| `bun run typecheck` | TypeScript type checking |
| `bun run clean` | Clean build artifacts |
| `bun run demo` | Open interactive demo page |
| `bun run examples:sdk` | Run SDK usage examples |

### API Testing
| Script | Description |
|--------|-------------|
| `bun run api:health` | Check API health |
| `bun run api:info` | Get API information |
| `bun run api:test` | Test API with sample data |

### Documentation
| Script | Description |
|--------|-------------|
| `bun run docs:api` | View API documentation |

## 🔍 Detection Categories

### Local Detection (Chinese)
- **Political Sensitive**: Government, political figures
- **Violence Threats**: Violence, terrorism, weapons
- **Profanity/Abuse**: Cursing, personal attacks
- **Racial Discrimination**: Racial slurs, hate speech
- **Extreme Statements**: Harmful ideologies

### Azure Content Moderator
- **Hate**: Hateful content
- **Violence**: Violent content
- **Sexual**: Sexual content
- **Self-Harm**: Self-harm content

## 🛠️ Development

### Running Tests
```bash
# All tests
bun test

# Unit tests only
bun test tests/unit/

# Integration tests
bun test tests/integration/

# Quality evaluation
bun test tests/integration/highQualityEvaluation.test.ts
```

### Building for Production
```bash
bun run build:all
```

## 🐳 Docker Deployment

### Using Docker
```bash
# Build the image
docker build -t sensitive-word-api .

# Run the container
docker run -p 3000:3000 \
  -e AZURE_CONTENT_SAFETY_ENDPOINT="your-endpoint" \
  -e AZURE_CONTENT_SAFETY_KEY="your-key" \
  sensitive-word-api
```

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables
Set these in `.env` file or environment:
```bash
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-resource.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2023-10-01
AZURE_CONTENT_SAFETY_KEY=your-subscription-key
PORT=3000
NODE_ENV=production
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `bun run typecheck` and `bun run test`
6. Submit a pull request
