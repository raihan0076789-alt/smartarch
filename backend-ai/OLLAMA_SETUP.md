# Ollama Setup Guide

## What is Ollama?

Ollama is a local LLM runtime that allows you to run large language models on your own machine. This means:
- ✅ No external API costs
- ✅ Complete privacy - data never leaves your machine
- ✅ No internet required (after initial setup)
- ✅ Fast responses with local processing
- ✅ Multiple model support

## Installation

### macOS
```bash
# Download and install from https://ollama.ai
# Or use Homebrew
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows
Download the installer from [https://ollama.ai](https://ollama.ai)

## Installing the Phi3:mini Model

After installing Ollama, you need to download the phi3:mini model:

```bash
# Pull the model (this may take a few minutes)
ollama pull phi3:mini

# Verify installation
ollama list
```

You should see phi3:mini in the list of available models.

## Starting Ollama

### Automatic Start (Recommended)
On most systems, Ollama starts automatically as a background service.

### Manual Start
```bash
ollama serve
```

This will start the Ollama service on `http://localhost:11434`

## Verifying Installation

Test that Ollama is working:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Test the model
ollama run phi3:mini "Hello, how are you?"
```

## Using Different Models

While phi3:mini is recommended for its balance of speed and capability, you can use other models:

### Available Models
```bash
# List all available models to pull
ollama list

# Pull a different model
ollama pull llama3
ollama pull mistral
ollama pull codellama
```

### Configuring the Backend

Update your `.env` file to use a different model:

```env
OLLAMA_MODEL=llama3
# or
OLLAMA_MODEL=mistral
# or
OLLAMA_MODEL=codellama
```

## Model Comparison

| Model | Size | Best For | Speed |
|-------|------|----------|-------|
| phi3:mini | ~2GB | Balanced, recommended | Fast |
| llama3 | ~4GB | Better quality responses | Medium |
| mistral | ~4GB | Creative tasks | Medium |
| codellama | ~4GB | Code generation | Medium |

## Troubleshooting

### "Cannot connect to Ollama"
```bash
# Check if Ollama is running
ps aux | grep ollama

# If not running, start it
ollama serve
```

### "Model not found"
```bash
# Pull the model
ollama pull phi3:mini

# Verify it's available
ollama list
```

### Port Already in Use
If port 11434 is already in use, you can change the Ollama port:

```bash
# Set environment variable before starting
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

Then update your backend `.env`:
```env
OLLAMA_HOST=http://localhost:11435
```

### Performance Issues

If responses are slow:

1. **Use a smaller model**: phi3:mini is optimized for speed
2. **Check system resources**: Ollama requires adequate RAM
3. **Close other applications**: Free up system memory
4. **Use GPU acceleration**: If available, Ollama will automatically use it

### Memory Requirements

- **phi3:mini**: 4GB RAM minimum, 8GB recommended
- **llama3**: 8GB RAM minimum, 16GB recommended
- **mistral**: 8GB RAM minimum, 16GB recommended

## Advanced Configuration

### GPU Acceleration

Ollama automatically uses GPU if available:
- NVIDIA GPUs (CUDA)
- AMD GPUs (ROCm)
- Apple Silicon (Metal)

No additional configuration needed!

### Custom Modelfile

Create custom models with specific configurations:

```bash
# Create a Modelfile
cat > Modelfile << EOF
FROM phi3:mini
PARAMETER temperature 0.7
PARAMETER top_p 0.9
SYSTEM You are an expert software architect.
EOF

# Create the custom model
ollama create architect-phi3 -f Modelfile

# Use in your backend
OLLAMA_MODEL=architect-phi3
```

## API Reference

### Check Available Models
```bash
curl http://localhost:11434/api/tags
```

### Generate Response
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "phi3:mini",
  "prompt": "Explain microservices architecture"
}'
```

### Chat Completion
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "phi3:mini",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}'
```

## Best Practices

1. **Keep Ollama Updated**
```bash
# Update Ollama
brew upgrade ollama  # macOS
# Or download latest from ollama.ai
```

2. **Regular Model Updates**
```bash
# Update your models
ollama pull phi3:mini
```

3. **Monitor Performance**
```bash
# Check Ollama logs
ollama logs
```

4. **Resource Management**
- Ollama loads models into memory when first used
- Models stay in memory for 5 minutes after last use
- Memory is automatically freed when not in use

## Integration with Backend

The backend automatically connects to Ollama using these settings:

```env
# Default configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=phi3:mini
```

The backend will:
1. Check if Ollama is running
2. Verify the model is available
3. Provide helpful error messages if issues occur

## Support

### Official Resources
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Ollama Discord](https://discord.gg/ollama)
- [Model Library](https://ollama.com/library)

### Common Issues
- Check [Ollama GitHub Issues](https://github.com/ollama/ollama/issues)
- Search for similar problems in the community

## Summary

You now have:
✅ Ollama installed and running
✅ Phi3:mini model ready to use
✅ Backend configured to use local AI
✅ No external API dependencies
✅ Complete privacy and control

The backend will automatically connect to your local Ollama instance and start processing architecture requests!
