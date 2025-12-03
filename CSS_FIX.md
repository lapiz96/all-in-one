# 🔧 CSS Fix - Manual Instructions

## Problem
The `styles.css` file has syntax errors around lines 534-551 due to corrupted edits.

## Quick Fix

### Option 1: Restore from Git (If using version control)
```bash
git checkout styles.css
```

### Option 2: Manual Fix

Open `styles.css` and find around line 530-560. You should see missing selectors.

**Add these missing CSS rules after `.price-amount` (around line 547):**

```css
.price-period {
    font-size: var(--font-size-base);
    color: var(--color-text-tertiary);
}

.pricing-features {
    list-style: none;
    margin-bottom: var(--spacing-lg);
}

.pricing-features li {
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-sm);
    padding-left: var(--spacing-sm);
}

.pricing-btn {
    width: 100%;
    padding: 1.25rem 2.5rem;
    font-size: 1.125rem;
    font-weight: 800;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border: none;
    font-family: var(--font-family);
}

.pricing-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s ease;
}

.pricing-btn:hover::before {
    left: 100%;
}

/* Free tier button */
.pricing-card:nth-child(1) .pricing-btn {
    background: rgba(0, 255, 136, 0.1);
    color: var(--color-accent-primary);
    border: 2px solid var(--color-accent-primary);
    box-shadow: 0 4px 15px rgba(0, 255, 136, 0.2);
}

.pricing-card:nth-child(1) .pricing-btn:hover {
    background: var(--gradient-primary);
    color: #0a0a0a;
    transform: translateY(-4px) scale(1.03);
    box-shadow: 0 12px 30px rgba(0, 255, 136, 0.4);
}

/* Pro tier button - Featured */
.pricing-featured .pricing-btn {
    background: var(--gradient-primary);
    color: #0a0a0a;
    font-size: 1.25rem;
    padding: 1.5rem 3rem;
    box-shadow: 0 8px 25px rgba(0, 255, 136, 0.5);
    animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
    0%, 100% {
        box-shadow: 0 8px 25px rgba(0, 255, 136, 0.5);
    }
    50% {
        box-shadow: 0 8px 35px rgba(0, 255, 136, 0.7);
    }
}

.pricing-featured .pricing-btn:hover {
    transform: translateY(-6px) scale(1.05);
    box-shadow: 0 20px 50px rgba(0, 255, 136, 0.6);
    animation: none;
}

/* Pay-per-use button */
.pricing-card:nth-child(3) .pricing-btn {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-text-primary);
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.pricing-card:nth-child(3) .pricing-btn:hover {
    background: var(--gradient-secondary);
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
    transform: translateY(-4px) scale(1.03);
    box-shadow: 0 12px 30px rgba(0, 255, 136, 0.3);
}

/* Pro button icon */
.pricing-featured .pricing-btn::after {
    content: '⚡';
    margin-left: 10px;
    font-size: 1.4em;
    display: inline-block;
    animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-4px);
    }
}

/* ========================
   Workspace
   ======================== */
.workspace {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-primary);
    z-index: 2000;
    overflow-y: auto;
}

.workspace-header {
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    padding: var(--spacing-md) var(--spacing-lg);
    /* rest of the properties... */
}
```

## Test
After fixing, press `Ctrl + Shift + R` in your browser to hard refresh.

## Alternative: Use a Clean Template

If manual fixing is too complex, I can provide a complete clean `styles.css` file. Let me know!

---

**Note:** The pricing buttons are designed to be:
- **Get Started**: Green outline → fills on hover
- **Upgrade Now**: Pulsing glow + bouncing ⚡ icon (most attractive!)
- **Buy Credits**: Subtle gray → green on hover
