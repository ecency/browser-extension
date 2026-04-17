import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect } from 'react';
import { ConnectedProps, connect } from 'react-redux';

const DAPPS = [
  { name: 'PeakD', url: 'https://peakd.com', desc: 'Social blogging' },
  { name: 'Ecency', url: 'https://ecency.com', desc: 'Social blogging' },
  { name: 'Splinterlands', url: 'https://splinterlands.com', desc: 'Card game' },
  { name: 'LeoFinance', url: 'https://leofinance.io', desc: 'Finance community' },
  { name: 'HiveEngine', url: 'https://hive-engine.com', desc: 'Token exchange' },
  { name: '3Speak', url: 'https://3speak.tv', desc: 'Video platform' },
];

const Ecosystem = ({ setTitleContainerProperties }: PropsFromRedux) => {
  useEffect(() => {
    setTitleContainerProperties({
      title: 'ecosystem',
      isBackButtonEnabled: true,
    });
  }, []);

  return (
    <div
      className="ecosystem-page"
      data-testid={`${Screen.ECOSYSTEM_PAGE}-page`}
      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {DAPPS.map((dapp) => (
        <div
          key={dapp.name}
          onClick={() => chrome.tabs.create({ url: dapp.url })}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <div>
            <div style={{ fontWeight: 600 }}>{dapp.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>{dapp.desc}</div>
          </div>
          <div style={{ fontSize: '18px' }}>&#8250;</div>
        </div>
      ))}
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({});
const connector = connect(mapStateToProps, { setTitleContainerProperties });
type PropsFromRedux = ConnectedProps<typeof connector>;
export const EcosystemComponent = connector(Ecosystem);
