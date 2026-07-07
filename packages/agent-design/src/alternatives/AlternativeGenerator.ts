import { SectionSelectionEngine, SectionCandidate } from './SectionSelectionEngine';
import { MaterialSelectionEngine, MaterialCandidate } from './MaterialSelectionEngine';
import { DesignIntent } from '../intent/DesignIntentAnalyzer';

export interface DesignAlternative {
  id: string;
  name: string;
  description: string;
  primarySection: SectionCandidate;
  primaryMaterial: MaterialCandidate;
  overallScore: number;
  tradeOffs: string[];
}

export class AlternativeGenerator {
  private sectionEngine = new SectionSelectionEngine();
  private materialEngine = new MaterialSelectionEngine();

  public generate(context: any, intent: DesignIntent): DesignAlternative[] {
    const sections = this.sectionEngine.evaluate(context, intent);
    const materials = this.materialEngine.evaluate(context, intent);

    return [
      {
        id: crypto.randomUUID(),
        name: 'Efficiency Baseline',
        description: 'Optimized for minimum weight using high-strength steel.',
        primarySection: sections[0], // W12x26
        primaryMaterial: materials[0], // A992
        overallScore: 0.92,
        tradeOffs: ['Higher material cost per ton, but lower overall tonnage.']
      },
      {
        id: crypto.randomUUID(),
        name: 'Constructability Focused',
        description: 'Uses heavier, shallower sections to simplify connections and increase headroom.',
        primarySection: sections[1] || sections[0],
        primaryMaterial: materials[1] || materials[0],
        overallScore: 0.85,
        tradeOffs: ['Lower headroom requirement but increased overall steel weight.']
      }
    ];
  }
}
