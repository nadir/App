import React from 'react';
import {ScrollView, View} from 'react-native';
import _ from 'underscore';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import withFullPolicy, {fullPolicyDefaultProps, fullPolicyPropTypes} from './withFullPolicy';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import compose from '../../libs/compose';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import Navigation from '../../libs/Navigation/Navigation';
import ScreenWrapper from '../../components/ScreenWrapper';
import styles from '../../styles/styles';
import TextInputWithLabel from '../../components/TextInputWithLabel';
import Picker from '../../components/Picker';
import ONYXKEYS from '../../ONYXKEYS';
import CONST from '../../CONST';
import Button from '../../components/Button';
import FixedFooter from '../../components/FixedFooter';
import * as Report from '../../libs/actions/Report';
import Permissions from '../../libs/Permissions';
import Log from '../../libs/Log';
import KeyboardAvoidingView from '../../components/KeyboardAvoidingView';

const propTypes = {
    /** All reports shared with the user */
    reports: PropTypes.shape({
        reportName: PropTypes.string,
        type: PropTypes.string,
        policyID: PropTypes.string,
    }).isRequired,

    /** Are we loading the createPolicyRoom command */
    isLoadingCreatePolicyRoom: PropTypes.bool,

    ...fullPolicyPropTypes,

    ...withLocalizePropTypes,
};
const defaultProps = {
    betas: [],
    isLoadingCreatePolicyRoom: false,
    ...fullPolicyDefaultProps,
};

class WorkspaceNewRoomPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            roomName: '',
            policyID: '',
            visibility: CONST.REPORT.VISIBILITY.RESTRICTED,
            errors: {},
            workspaceOptions: [],
        };
        this.validateAndCreatePolicyRoom = this.validateAndCreatePolicyRoom.bind(this);
        this.clearErrorAndSetValue = this.clearErrorAndSetValue.bind(this);
        this.modifyRoomName = this.modifyRoomName.bind(this);
    }

    componentDidMount() {
        // Workspaces are policies with type === 'free'
        const workspaces = _.filter(this.props.policies, policy => policy && policy.type === CONST.POLICY.TYPE.FREE);
        this.setState({workspaceOptions: _.map(workspaces, policy => ({label: policy.name, key: policy.id, value: policy.id}))});
    }

    componentDidUpdate(prevProps) {
        if (this.props.policies.length === prevProps.policies.length) {
            return;
        }

        // Workspaces are policies with type === 'free'
        const workspaces = _.filter(this.props.policies, policy => policy && policy.type === CONST.POLICY.TYPE.FREE);

        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({workspaceOptions: _.map(workspaces, policy => ({label: policy.name, key: policy.id, value: policy.id}))});
    }

    validateAndCreatePolicyRoom() {
        if (!this.validate()) {
            return;
        }
        Report.createPolicyRoom(
            this.state.policyID,
            this.state.roomName,
            this.state.visibility,
        );
    }

    /**
     * @returns {Boolean}
     */
    validate() {
        const errors = {};

        const isExistingRoomName = _.some(
            _.values(this.props.reports),
            report => report && report.policyID === this.state.policyID
            && report.reportName === this.state.roomName,
        );

        if (!this.state.roomName || this.state.roomName === CONST.ROOM_PREFIX) {
            errors.roomName = this.props.translate('newRoomPage.pleaseEnterRoomName');
        } else if (this.state.policyID && isExistingRoomName) {
            errors.roomName = this.props.translate('newRoomPage.roomAlreadyExists');
        }

        if (!this.state.policyID) {
            errors.policyID = this.props.translate('newRoomPage.pleaseChooseWorkspace');
        }

        if (!this.state.visibility) {
            errors.visibility = this.props.translate('newRoomPage.pleaseChooseVisibility');
        }

        this.setState({errors});
        return Boolean(_.isEmpty(errors));
    }

    /**
     * @param {String} inputKey
     * @param {String} value
     */
    clearErrorAndSetValue(inputKey, value) {
        this.setState(prevState => ({
            [inputKey]: value,
            errors: {
                ...prevState.errors,
                [inputKey]: '',
            },
        }));
    }

    /**
     * Modifies the room name to follow our conventions:
     * - Max length 80 characters
     * - Cannot not include space or special characters, and we automatically apply an underscore for spaces
     * - Must be lowercase
     * provides the modified room name.
     * @param {String} roomName
     *
     * @returns {String}
     */
    modifyRoomName(roomName) {
        const modifiedRoomNameWithoutHash = roomName.substr(1)
            .replace(/ /g, '_')
            .replace(/[^a-zA-Z\d_]/g, '')
            .substr(0, CONST.REPORT.MAX_ROOM_NAME_LENGTH)
            .toLowerCase();
        const modifiedRoomName = `${CONST.ROOM_PREFIX}${modifiedRoomNameWithoutHash}`;

        return modifiedRoomName;
    }

    render() {
        if (!Permissions.canUseDefaultRooms(this.props.betas)) {
            Log.info('Not showing create Policy Room page since user is not on default rooms beta');
            Navigation.dismissModal();
            return null;
        }

        const visibilityOptions = _.map(_.values(CONST.REPORT.VISIBILITY), visibilityOption => ({
            label: this.props.translate(`newRoomPage.visibilityOptions.${visibilityOption}`),
            value: visibilityOption,
        }));

        return (
            <ScreenWrapper>
                <KeyboardAvoidingView>
                    <HeaderWithCloseButton
                        title={this.props.translate('newRoomPage.newRoom')}
                        onCloseButtonPress={() => Navigation.dismissModal()}
                    />
                    <ScrollView style={styles.flex1} contentContainerStyle={styles.p5}>
                        <TextInputWithLabel
                            label={this.props.translate('newRoomPage.roomName')}
                            prefixCharacter={CONST.ROOM_PREFIX}
                            placeholder={this.props.translate('newRoomPage.social')}
                            containerStyles={[styles.mb5]}
                            onChangeText={roomName => this.clearErrorAndSetValue('roomName', this.modifyRoomName(roomName))}
                            value={this.state.roomName.substr(1)}
                            errorText={this.state.errors.roomName}
                            autoCapitalize="none"
                        />
                        <View style={styles.mb5}>
                            <Picker
                                value={this.state.policyID}
                                label={this.props.translate('workspace.common.workspace')}
                                placeholder={{value: '', label: this.props.translate('newRoomPage.selectAWorkspace')}}
                                items={this.state.workspaceOptions}
                                errorText={this.state.errors.policyID}
                                onChange={policyID => this.clearErrorAndSetValue('policyID', policyID)}
                            />
                        </View>
                        <Picker
                            value={this.state.visibility}
                            label={this.props.translate('newRoomPage.visibility')}
                            items={visibilityOptions}
                            errorText={this.state.errors.visibility}
                            onChange={visibility => this.clearErrorAndSetValue('visibility', visibility)}
                        />
                    </ScrollView>
                    <FixedFooter>
                        <Button
                            isLoading={this.props.isLoadingCreatePolicyRoom}
                            success
                            pressOnEnter
                            onPress={this.validateAndCreatePolicyRoom}
                            style={[styles.w100]}
                            text={this.props.translate('newRoomPage.createRoom')}
                        />
                    </FixedFooter>
                </KeyboardAvoidingView>
            </ScreenWrapper>
        );
    }
}

WorkspaceNewRoomPage.propTypes = propTypes;
WorkspaceNewRoomPage.defaultProps = defaultProps;

export default compose(
    withFullPolicy,
    withOnyx({
        betas: {
            key: ONYXKEYS.BETAS,
        },
        policies: {
            key: ONYXKEYS.COLLECTION.POLICY,
        },
        reports: {
            key: ONYXKEYS.COLLECTION.REPORT,
        },
        isLoadingCreatePolicyRoom: {
            key: ONYXKEYS.IS_LOADING_CREATE_POLICY_ROOM,
        },
    }),
    withLocalize,
)(WorkspaceNewRoomPage);
