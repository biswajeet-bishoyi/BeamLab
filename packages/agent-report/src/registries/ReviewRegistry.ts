export interface ReportReview {
  reviewId: string;
  reportId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewer: string;
  comments: string;
  timestamp: string;
}

export class ReviewRegistry {
  private reviews: Map<string, ReportReview> = new Map();

  public register(review: ReportReview): void {
    this.reviews.set(review.reviewId, review);
  }

  public getByReport(reportId: string): ReportReview[] {
    return Array.from(this.reviews.values()).filter(r => r.reportId === reportId);
  }
}
