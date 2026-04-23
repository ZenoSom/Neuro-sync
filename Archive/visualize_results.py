# Quick fix - just add this to visualize your results
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

# Load your results
results_df = pd.read_csv('adhd_detection_results.csv')

# Create visualizations
fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# Plot 1: Accuracy Comparison
ax1 = axes[0, 0]
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#F8D62E']
bars = ax1.barh(results_df['Model'], results_df['Accuracy'], color=colors, alpha=0.8)
ax1.set_xlabel('Accuracy', fontweight='bold', fontsize=11)
ax1.set_title('Model Accuracy Comparison', fontweight='bold', fontsize=12)
ax1.set_xlim([0.85, 0.95])
for i, v in enumerate(results_df['Accuracy']):
    ax1.text(v + 0.002, i, f'{v:.4f}', va='center', fontweight='bold', fontsize=9)

# Plot 2: All Metrics
ax2 = axes[0, 1]
x = np.arange(len(results_df))
width = 0.15
ax2.bar(x - 2*width, results_df['Accuracy'], width, label='Accuracy', alpha=0.8)
ax2.bar(x - width, results_df['Precision'], width, label='Precision', alpha=0.8)
ax2.bar(x, results_df['Recall'], width, label='Recall', alpha=0.8)
ax2.bar(x + width, results_df['F1-Score'], width, label='F1-Score', alpha=0.8)
ax2.bar(x + 2*width, results_df['ROC-AUC'], width, label='ROC-AUC', alpha=0.8)
ax2.set_ylabel('Score', fontweight='bold', fontsize=11)
ax2.set_title('All Metrics Comparison', fontweight='bold', fontsize=12)
ax2.set_xticks(x)
ax2.set_xticklabels([f'M{i+1}' for i in range(len(results_df))], fontsize=9)
ax2.legend(fontsize=8, loc='lower right')
ax2.set_ylim([0.85, 1.0])
ax2.grid(axis='y', alpha=0.3)

# Plot 3: ROC-AUC Comparison
ax3 = axes[1, 0]
bars = ax3.barh(results_df['Model'], results_df['ROC-AUC'], color=colors, alpha=0.8)
ax3.set_xlabel('ROC-AUC Score', fontweight='bold', fontsize=11)
ax3.set_title('ROC-AUC Comparison', fontweight='bold', fontsize=12)
ax3.set_xlim([0.85, 1.0])
for i, v in enumerate(results_df['ROC-AUC']):
    ax3.text(v + 0.003, i, f'{v:.4f}', va='center', fontweight='bold', fontsize=9)

# Plot 4: Summary Table
ax4 = axes[1, 1]
ax4.axis('tight')
ax4.axis('off')
table_data = results_df.round(4).values.tolist()
table = ax4.table(cellText=table_data, colLabels=results_df.columns, cellLoc='center', loc='center')
table.auto_set_font_size(False)
table.set_fontsize(8)
table.scale(1, 2)
ax4.set_title('Results Summary Table', fontweight='bold', fontsize=12, pad=20)

plt.tight_layout()
plt.savefig('adhd_detection_comparison.png', dpi=300, bbox_inches='tight')
print("✓ Visualization saved: adhd_detection_comparison.png")
plt.show()

print("\n" + "="*80)
print("VISUALIZATIONS COMPLETE!")
print("="*80)
print(f"\nBest Model: {results_df.loc[results_df['Accuracy'].idxmax(), 'Model']}")
print(f"Best Accuracy: {results_df['Accuracy'].max():.4f}")
