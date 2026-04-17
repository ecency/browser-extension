import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect } from 'react';
import { ConnectedProps, connect } from 'react-redux';

const EXCHANGES = [
  { name: 'Binance', url: 'https://www.binance.com/en/trade/HIVE_USDT' },
  { name: 'Upbit', url: 'https://upbit.com/exchange?code=CRIX.UPBIT.BTC-HIVE' },
  { name: 'Bitget', url: 'https://www.bitget.com/spot/HIVEUSDT' },
  { name: 'Gate.io', url: 'https://www.gate.io/trade/HIVE_USDT' },
  { name: 'MEXC', url: 'https://www.mexc.com/exchange/HIVE_USDT' },
  { name: 'Probit', url: 'https://www.probit.com/app/exchange/HIVE-USDT' },
];

const Buy = ({ setTitleContainerProperties }: PropsFromRedux) => {
  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_buy',
      isBackButtonEnabled: true,
    });
  }, []);

  return (
    <div
      className="buy-page"
      data-testid={`${Screen.BUY_PAGE}-page`}
      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '8px' }}>
        {chrome.i18n.getMessage('popup_html_buy_from_exchanges') ||
          'Buy HIVE from these exchanges:'}
      </div>
      {EXCHANGES.map((ex) => (
        <div
          key={ex.name}
          onClick={() => chrome.tabs.create({ url: ex.url })}
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
          }}>
          {ex.name}
          <div style={{ fontSize: '18px' }}>&#8250;</div>
        </div>
      ))}
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({});
const connector = connect(mapStateToProps, { setTitleContainerProperties });
type PropsFromRedux = ConnectedProps<typeof connector>;
export const BuyComponent = connector(Buy);
