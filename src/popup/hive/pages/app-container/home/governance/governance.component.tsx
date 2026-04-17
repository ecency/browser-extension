import { Witness } from '@interfaces/witness.interface';
import { setErrorMessage } from '@popup/multichain/actions/message.actions';
import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import React, { useEffect, useState } from 'react';
import { ConnectedProps, connect } from 'react-redux';
import 'react-tabs/style/react-tabs.scss';
import RotatingLogoComponent from 'src/common-ui/rotating-logo/rotating-logo.component';
import { Tab, TabsComponent } from 'src/common-ui/tabs/tabs.component';
import { MyWitnessTabComponent } from 'src/popup/hive/pages/app-container/home/governance/my-witness-tab/my-witness-tab.component';
import { ProposalTabComponent } from 'src/popup/hive/pages/app-container/home/governance/proposal-tab/proposal-tab.component';
import { ProxyTabComponent } from 'src/popup/hive/pages/app-container/home/governance/proxy-tab/proxy-tab.component';
import { WitnessTabComponent } from 'src/popup/hive/pages/app-container/home/governance/witness-tab/witness-tab.component';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { Screen } from 'src/reference-data/screen.enum';

const Governance = ({
  setTitleContainerProperties,
  setErrorMessage,
  activeAccount,
}: PropsFromRedux) => {
  const [isLoading, setIsLoading] = useState(true);

  const [tabs, setTabs] = useState<Tab[]>([]);

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_governance',
      isBackButtonEnabled: true,
    });
    init();
  }, []);

  const init = async () => {
    let ranking: Witness[] = [];
    let hasError = false;
    try {
      // Fetch the top 100 witnesses ordered by vote weight directly from RPC.
      // Replaces the legacy api.hive-keychain.com hive/v2/witnesses-ranks
      // off-chain index.
      const result = await HiveTxUtils.getData(
        'condenser_api.get_witnesses_by_vote',
        ['', 100],
      );
      ranking = (result || []).map((w: any, i: number) => ({
        name: w.owner,
        rank: String(i + 1),
        active_rank: String(i + 1),
        votes: w.votes,
        signing_key: w.signing_key,
        url: w.url,
      })) as Witness[];
    } catch (err) {
      ranking = [];
    }
    if (!ranking.length) {
      hasError = true;
      setErrorMessage('popup_html_error_retrieving_witness_ranking');
    }
    const tempTabs: Tab[] = [
      {
        title: 'popup_html_witness',
        content: <WitnessTabComponent ranking={ranking} hasError={hasError} />,
      },
      {
        title: 'popup_html_proxy',
        content: <ProxyTabComponent />,
      },
      {
        title: 'popup_html_proposal',
        content: <ProposalTabComponent />,
      },
    ];
    if (
      ranking &&
      ranking.length > 0 &&
      ranking.find((witness) => witness.name === activeAccount.name!) !==
        undefined
    ) {
      tempTabs.push({
        title: 'popup_html_my_witness_page',
        content: <MyWitnessTabComponent ranking={ranking} />,
      });
    }
    setTabs(tempTabs);

    setIsLoading(false);
  };

  return (
    <div
      className="governance-page"
      aria-label="governance-page"
      data-testid={`${Screen.GOVERNANCE_PAGE}-page`}>
      {!isLoading && <TabsComponent tabs={tabs} />}
      {isLoading && (
        <div className="rotating-logo-container">
          <RotatingLogoComponent />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return { activeAccount: state.hive.activeAccount };
};

const connector = connect(mapStateToProps, {
  setTitleContainerProperties,
  setErrorMessage,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const GovernanceComponent = connector(Governance);
