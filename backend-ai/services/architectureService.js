import { Ollama } from 'ollama';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';

class ArchitectureService {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'phi3:mini';
    
    this.ollama = new Ollama({
      host: this.ollamaHost
    });

    logger.info(`Ollama service initialized with host: ${this.ollamaHost}, model: ${this.model}`);
  }

  async callLlamaAPI(systemPrompt, userPrompt, requestId) {
    try {
      logger.info(`[${requestId}] Calling Ollama with model: ${this.model}`);
      
      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 4096
        }
      });

      if (!response || !response.message || !response.message.content) {
        throw new ApiError('Invalid response from Ollama', 500);
      }

      logger.info(`[${requestId}] Ollama response received successfully`);
      return response.message.content;
    } catch (error) {
      logger.error(`[${requestId}] Error calling Ollama:`, {
        error: error.message,
        stack: error.stack
      });

      if (error.code === 'ECONNREFUSED') {
        throw new ApiError(
          'Cannot connect to Ollama service. Please ensure Ollama is running at ' + this.ollamaHost,
          503
        );
      } else if (error.message.includes('model') && error.message.includes('not found')) {
        throw new ApiError(
          `Model '${this.model}' not found. Please pull it using: ollama pull ${this.model}`,
          404
        );
      } else {
        throw new ApiError(
          `Error calling Ollama: ${error.message}`,
          error.statusCode || 500
        );
      }
    }
  }

  async generateArchitecture(requirements, preferences = {}, constraints = {}, requestId) {
    const systemPrompt = `You are an expert software architect with deep knowledge of system design, cloud architecture, microservices, distributed systems, and best practices. Your role is to generate comprehensive, production-ready architecture designs based on user requirements.

Key responsibilities:
- Create detailed system architecture diagrams and descriptions
- Recommend appropriate technologies, frameworks, and patterns
- Consider scalability, performance, security, and maintainability
- Provide clear rationale for all architectural decisions
- Include component interactions, data flow, and deployment strategies`;

    const userPrompt = `Generate a comprehensive software architecture based on the following:

Requirements:
${requirements}

Preferences:
${JSON.stringify(preferences, null, 2)}

Constraints:
${JSON.stringify(constraints, null, 2)}

Please provide:
1. High-level architecture overview
2. Core components and their responsibilities
3. Technology stack recommendations with justification
4. Data flow and communication patterns
5. Scalability considerations
6. Security measures
7. Deployment strategy
8. Potential challenges and mitigation strategies

Format the response as a structured JSON object with these sections.`;

    try {
      const response = await this.callLlamaAPI(systemPrompt, userPrompt, requestId);
      return this.parseArchitectureResponse(response);
    } catch (error) {
      logger.error(`[${requestId}] Error in generateArchitecture:`, error);
      throw error;
    }
  }

  async analyzeArchitecture(architecture, analysisType, requestId) {
    const systemPrompt = `You are an expert software architect specializing in architecture review and analysis. Your role is to critically evaluate existing architectures, identify strengths and weaknesses, and provide actionable recommendations.

Focus areas:
- Design patterns and best practices adherence
- Performance bottlenecks and optimization opportunities
- Security vulnerabilities and compliance issues
- Scalability limitations
- Technical debt identification
- Cost optimization opportunities`;

    const userPrompt = `Analyze the following architecture and provide a ${analysisType} analysis:

Architecture:
${JSON.stringify(architecture, null, 2)}

Please provide:
1. Overall architecture assessment
2. Strengths and advantages
3. Weaknesses and limitations
4. Security analysis
5. Performance considerations
6. Scalability assessment
7. Recommendations for improvement
8. Risk assessment
9. Cost optimization opportunities

Format the response as a structured JSON object.`;

    try {
      const response = await this.callLlamaAPI(systemPrompt, userPrompt, requestId);
      return this.parseAnalysisResponse(response);
    } catch (error) {
      logger.error(`[${requestId}] Error in analyzeArchitecture:`, error);
      throw error;
    }
  }

  async optimizeArchitecture(architecture, optimizationGoals, requestId) {
    const systemPrompt = `You are an expert software architect specializing in architecture optimization. Your role is to refine existing architectures to meet specific performance, scalability, cost, and reliability goals.

Optimization expertise:
- Performance tuning and latency reduction
- Scalability improvements (horizontal and vertical)
- Cost optimization strategies
- Resource utilization improvements
- Reliability and fault tolerance enhancements`;

    const userPrompt = `Optimize the following architecture based on these goals: ${optimizationGoals.join(', ')}

Current Architecture:
${JSON.stringify(architecture, null, 2)}

Please provide:
1. Optimized architecture design
2. Key changes and improvements
3. Expected benefits for each optimization goal
4. Implementation complexity and effort
5. Trade-offs and considerations
6. Migration strategy from current to optimized architecture
7. Performance metrics and KPIs to track
8. Cost implications

Format the response as a structured JSON object.`;

    try {
      const response = await this.callLlamaAPI(systemPrompt, userPrompt, requestId);
      return this.parseOptimizationResponse(response);
    } catch (error) {
      logger.error(`[${requestId}] Error in optimizeArchitecture:`, error);
      throw error;
    }
  }

  async compareArchitectures(architectures, comparisonCriteria, requestId) {
    const systemPrompt = `You are an expert software architect specializing in architecture comparison and evaluation. Your role is to objectively compare different architectural approaches and provide data-driven recommendations.

Comparison expertise:
- Multi-criteria analysis
- Pros and cons evaluation
- Cost-benefit analysis
- Risk assessment
- Use case suitability`;

    const userPrompt = `Compare the following architectures based on these criteria: ${comparisonCriteria.join(', ')}

Architectures to compare:
${JSON.stringify(architectures, null, 2)}

Please provide:
1. Side-by-side comparison matrix
2. Detailed analysis for each criterion
3. Strengths and weaknesses of each architecture
4. Use case recommendations
5. Overall recommendation with justification
6. Decision factors summary
7. Risk comparison
8. Cost comparison

Format the response as a structured JSON object.`;

    try {
      const response = await this.callLlamaAPI(systemPrompt, userPrompt, requestId);
      return this.parseComparisonResponse(response);
    } catch (error) {
      logger.error(`[${requestId}] Error in compareArchitectures:`, error);
      throw error;
    }
  }

  async generateDocumentation(architecture, documentationType, requestId) {
    const systemPrompt = `You are an expert technical writer specializing in software architecture documentation. Your role is to create clear, comprehensive, and well-structured documentation for technical and non-technical audiences.

Documentation expertise:
- Architecture Decision Records (ADRs)
- System design documents
- API documentation
- Deployment guides
- Runbooks and operational procedures`;

    const userPrompt = `Generate ${documentationType} documentation for the following architecture:

Architecture:
${JSON.stringify(architecture, null, 2)}

Please provide:
1. Executive summary
2. Architecture overview
3. Component descriptions
4. Data flow diagrams (textual description)
5. API specifications
6. Deployment procedures
7. Monitoring and observability
8. Troubleshooting guide
9. Glossary of terms

Format the response as a structured JSON object with markdown-formatted sections.`;

    try {
      const response = await this.callLlamaAPI(systemPrompt, userPrompt, requestId);
      return this.parseDocumentationResponse(response);
    } catch (error) {
      logger.error(`[${requestId}] Error in generateDocumentation:`, error);
      throw error;
    }
  }

  async getArchitectureSuggestions(currentArchitecture, problemAreas, requestId) {
    const systemPrompt = `You are an expert software architect specializing in problem-solving and architecture improvements. Your role is to identify issues in existing architectures and provide practical, actionable suggestions.

Suggestion expertise:
- Problem diagnosis
- Solution design
- Best practices application
- Modern patterns and technologies
- Incremental improvement strategies`;

    const userPrompt = `Provide improvement suggestions for the following architecture:

Current Architecture:
${JSON.stringify(currentArchitecture, null, 2)}

Problem Areas:
${JSON.stringify(problemAreas, null, 2)}

Please provide:
1. Identified issues and their impact
2. Prioritized list of suggestions
3. Detailed solution for each suggestion
4. Implementation complexity and effort
5. Expected benefits and ROI
6. Quick wins vs long-term improvements
7. Risk mitigation strategies
8. Alternative approaches

Format the response as a structured JSON object.`;

    try {
      const response = await this.callLlamaAPI(systemPrompt, userPrompt, requestId);
      return this.parseSuggestionsResponse(response);
    } catch (error) {
      logger.error(`[${requestId}] Error in getArchitectureSuggestions:`, error);
      throw error;
    }
  }

  parseArchitectureResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        architecture: response,
        rawResponse: true
      };
    } catch (error) {
      return {
        architecture: response,
        rawResponse: true,
        parseError: error.message
      };
    }
  }

  parseAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        analysis: response,
        rawResponse: true
      };
    } catch (error) {
      return {
        analysis: response,
        rawResponse: true,
        parseError: error.message
      };
    }
  }

  parseOptimizationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        optimization: response,
        rawResponse: true
      };
    } catch (error) {
      return {
        optimization: response,
        rawResponse: true,
        parseError: error.message
      };
    }
  }

  parseComparisonResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        comparison: response,
        rawResponse: true
      };
    } catch (error) {
      return {
        comparison: response,
        rawResponse: true,
        parseError: error.message
      };
    }
  }

  parseDocumentationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        documentation: response,
        rawResponse: true
      };
    } catch (error) {
      return {
        documentation: response,
        rawResponse: true,
        parseError: error.message
      };
    }
  }

  parseSuggestionsResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        suggestions: response,
        rawResponse: true
      };
    } catch (error) {
      return {
        suggestions: response,
        rawResponse: true,
        parseError: error.message
      };
    }
  }
}

export const architectureService = new ArchitectureService();
