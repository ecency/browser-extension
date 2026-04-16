import { MenuItem } from '@interfaces/menu-item.interface';
import { SVGIcons } from 'src/common-ui/icons.enum';
import Config from 'src/config';

const HelpSubMenuItems: MenuItem[] = [
  {
    label: 'popup_html_contact_support',
    icon: SVGIcons.MENU_SUPPORT,
    action: () => {
      chrome.tabs.create({ url: Config.social.discord });
    },
  },
];

export default HelpSubMenuItems;
