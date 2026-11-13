-- Undo 20261113140000_mini_games.sql: the games go away with their plays
-- and the points they gave, and the ledger forgets the mini-game reason.

drop function public.play_mini_game(text, integer);
drop function public.mini_game_status();

delete from public.loyalty_transactions where reason = 'mini-game';

drop index public.loyalty_transactions_one_award_per_play;

alter table public.loyalty_transactions
  drop constraint loyalty_transactions_reason_rules;
alter table public.loyalty_transactions
  add constraint loyalty_transactions_reason_rules check (
    case reason
      when 'order-completed' then points > 0 and order_id is not null
      when 'reward-redeemed' then points < 0
      else true
    end
  );

alter table public.loyalty_transactions
  drop constraint loyalty_transactions_reason_check;
alter table public.loyalty_transactions
  add constraint loyalty_transactions_reason_check check (
    reason in ('order-completed', 'reward-redeemed', 'adjustment')
  );

alter table public.loyalty_transactions drop column game_play_id;

drop table public.game_plays;
drop function private.reject_game_play_change();
drop function private.mini_game_settings();
