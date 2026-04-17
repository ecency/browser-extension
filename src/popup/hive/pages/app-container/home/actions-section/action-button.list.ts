import { SVGIcons } from 'src/common-ui/icons.enum';
import { ActionButton } from 'src/interfaces/action-button.interface';
import { Screen } from 'src/reference-data/screen.enum';

export const ActionButtonList: ActionButton[] = [
  {
    label: 'ecosystem',
    nextScreen: Screen.ECOSYSTEM_PAGE,
    icon: SVGIcons.BOTTOM_BAR_ECOSYSTEM,
  },
  {
    label: 'popup_html_send_transfer',
    nextScreen: Screen.TRANSFER_FUND_PAGE,
    nextScreenParams: { selectedCurrency: 'hive' },
    icon: SVGIcons.BOTTOM_BAR_SEND,
  },
  {
    label: 'popup_html_buy',
    nextScreen: Screen.BUY_PAGE,
    icon: SVGIcons.BOTTOM_BAR_BUY,
  },
  {
    label: 'popup_html_swap',
    nextScreen: Screen.SWAP_PAGE,
    icon: SVGIcons.BOTTOM_BAR_SWAPS,
  },
];
