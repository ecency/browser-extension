import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect } from 'react';
import { ConnectedProps, connect } from 'react-redux';

const Swap = ({ setTitleContainerProperties }: PropsFromRedux) => {
  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_swap',
      isBackButtonEnabled: true,
    });
  }, []);

  return (
    <div
      className="swap-page"
      data-testid={`${Screen.SWAP_PAGE}-page`}
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px',
        textAlign: 'center',
      }}>
      <div style={{ fontSize: '48px' }}>&#128260;</div>
      <div style={{ fontWeight: 600, fontSize: '18px' }}>
        {chrome.i18n.getMessage('popup_html_swap_coming_soon') || 'Swap — Coming Soon'}
      </div>
      <div style={{ fontSize: '13px', opacity: 0.6, maxWidth: '300px' }}>
        Swap HIVE, HBD, and Hive Engine tokens directly on-chain. No intermediary needed.
      </div>
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({});
const connector = connect(mapStateToProps, { setTitleContainerProperties });
type PropsFromRedux = ConnectedProps<typeof connector>;
export const SwapComponent = connector(Swap);
