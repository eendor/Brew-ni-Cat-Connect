import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MenuCartBar } from '@/components/cart/menu-cart-bar';
import * as CartContext from '@/context/cart-context';

vi.mock('@/context/cart-context', () => ({
  useCart: vi.fn(),
}));

describe('MenuCartBar Component', () => {
  it('is hidden when cart is empty or not hydrated', () => {
    vi.spyOn(CartContext, 'useCart').mockReturnValue({
      itemCount: 0,
      subtotal: 0,
      isEmpty: true,
      isHydrated: true,
      openDrawer: vi.fn(),
    } as unknown as ReturnType<typeof CartContext.useCart>);

    const { container } = render(<MenuCartBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders count and total when cart has items and opens drawer on click', () => {
    const mockOpenDrawer = vi.fn();
    vi.spyOn(CartContext, 'useCart').mockReturnValue({
      itemCount: 3,
      subtotal: 385,
      isEmpty: false,
      isHydrated: true,
      openDrawer: mockOpenDrawer,
    } as unknown as ReturnType<typeof CartContext.useCart>);

    render(<MenuCartBar />);
    expect(screen.getByText(/3 items · ₱385/i)).toBeInTheDocument();

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
  });
});