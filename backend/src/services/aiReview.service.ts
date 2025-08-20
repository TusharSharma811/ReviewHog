import chain from '../utils/aiUtil.js';
import { AppError } from '../middleware/errorHandler.js';

export interface AIReviewRequest {
  diff: string;
  fullFile: string;
  fileName?: string;
  pullRequestNumber?: number;
  repository?: string;
}

export interface AIReviewResponse {
  content: string;
  confidence?: number;
  issues?: Array<{
    line?: number;
    severity: 'low' | 'medium' | 'high';
    type: string;
    message: string;
  }>;
  suggestions?: Array<{
    line?: number;
    type: string;
    message: string;
    code?: string;
  }>;
  score?: number;
}

export class AIReviewService {
  async generateReview(request: AIReviewRequest): Promise<AIReviewResponse> {
    try {
      if (!request.diff || !request.fullFile) {
        throw new AppError('Missing required parameters for AI review', 400);
      }

      // Generate the AI review
      const response = await chain.invoke({
        diff: request.diff,
        full_file: request.fullFile,
      });

      if (!response || !response.content) {
        throw new AppError('AI service returned invalid response', 500);
      }

      // Parse the AI response (basic implementation)
      const content = typeof response.content === 'string' ? response.content : String(response.content);
      const score = this.extractScore(content);
      const issues = this.extractIssues(content);
      const suggestions = this.extractSuggestions(content);

      return {
        content,
        score,
        issues,
        suggestions,
        confidence: 0.85, // Default confidence level
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`AI service error: ${error.message}`, 503);
    }
  }

  private extractScore(content: string): number {
    // Simple score extraction based on common patterns
    if (content.toLowerCase().includes('looks good to me')) {
      return 95;
    }
    if (content.toLowerCase().includes('critical') || content.toLowerCase().includes('major issue')) {
      return 30;
    }
    if (content.toLowerCase().includes('minor issue') || content.toLowerCase().includes('suggestion')) {
      return 75;
    }
    return 85; // Default score
  }

  private extractIssues(content: string): Array<{ line?: number; severity: 'low' | 'medium' | 'high'; type: string; message: string; }> {
    const issues: Array<{ line?: number; severity: 'low' | 'medium' | 'high'; type: string; message: string; }> = [];
    
    // Basic pattern matching for issues
    const criticalPattern = /critical|security|vulnerability|dangerous/gi;
    const majorPattern = /major|important|serious|bug/gi;
    const minorPattern = /minor|suggestion|improvement|consider/gi;

    if (criticalPattern.test(content)) {
      issues.push({
        severity: 'high',
        type: 'security',
        message: 'Critical security or functionality issue detected',
      });
    }

    if (majorPattern.test(content)) {
      issues.push({
        severity: 'medium',
        type: 'bug',
        message: 'Potential bug or major issue detected',
      });
    }

    if (minorPattern.test(content)) {
      issues.push({
        severity: 'low',
        type: 'improvement',
        message: 'Minor improvement suggestion',
      });
    }

    return issues;
  }

  private extractSuggestions(content: string): Array<{ line?: number; type: string; message: string; code?: string; }> {
    const suggestions: Array<{ line?: number; type: string; message: string; code?: string; }> = [];
    
    // Extract suggestions from the content
    const suggestionLines = content.split('\n').filter(line => 
      line.toLowerCase().includes('suggest') || 
      line.toLowerCase().includes('recommend') ||
      line.toLowerCase().includes('consider')
    );

    suggestionLines.forEach(line => {
      suggestions.push({
        type: 'improvement',
        message: line.trim(),
      });
    });

    return suggestions;
  }

  async batchReview(requests: AIReviewRequest[]): Promise<AIReviewResponse[]> {
    try {
      const reviews = await Promise.all(
        requests.map(request => this.generateReview(request))
      );
      return reviews;
    } catch (error: any) {
      throw new AppError(`Batch review failed: ${error.message}`, 500);
    }
  }

  formatReviewComment(review: AIReviewResponse): string {
    let comment = `## AI Code Review\n\n${review.content}\n\n`;
    
    if (review.score !== undefined) {
      comment += `**Quality Score:** ${review.score}/100\n\n`;
    }

    if (review.issues && review.issues.length > 0) {
      comment += `### Issues Found (${review.issues.length})\n`;
      review.issues.forEach((issue, index) => {
        const severityEmoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        comment += `${index + 1}. ${severityEmoji} **${issue.type}**: ${issue.message}\n`;
      });
      comment += '\n';
    }

    if (review.suggestions && review.suggestions.length > 0) {
      comment += `### Suggestions (${review.suggestions.length})\n`;
      review.suggestions.forEach((suggestion, index) => {
        comment += `${index + 1}. 💡 **${suggestion.type}**: ${suggestion.message}\n`;
        if (suggestion.code) {
          comment += `\`\`\`\n${suggestion.code}\n\`\`\`\n`;
        }
      });
    }

    return comment;
  }
}