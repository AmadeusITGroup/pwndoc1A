import { ref, reactive, onMounted, onBeforeUnmount, getCurrentInstance, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cloneDeep, isEqual } from 'lodash';
import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb';
import CustomFields from 'components/custom-fields';

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import UserService from '@/services/user';
import Utils from '@/services/utils';
import { socket } from '@/boot/socketio';
import { useI18n } from 'vue-i18n';

export default {
    name: 'SectionEditor',
    props: {
        frontEndAuditState: Number,
        parentState: String,
        parentApprovals: Array
    },
    components: {
        BasicEditor,
        Breadcrumb,
        CustomFields
    },

    setup(props, { emit }) {
        const { proxy } = getCurrentInstance();
        const route = useRoute();
        const router = useRouter();
        const audit = computed(() => proxy.$parent.$parent.audit);
        const { t } = useI18n();
        const auditId = ref(null);
        const sectionId = ref(null);
        const section = reactive({
            field: "",
            name: "",
            customFields: []
        });
        const sectionOrig = ref({});
        const customFields = ref([]);
        const fieldHighlighted = ref("");
        const commentTemp = ref(null);
        const replyTemp = ref(null);
        const hoverReply = ref(null);

        const commentDateOptions = {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
        };

        const _listener = (e) => {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                if (props.frontEndAuditState === Utils.AUDIT_VIEW_STATE.EDIT)
                    updateSection();
            }
        };

        const getSection = async () => {
            try {
                const fieldsData = await DataService.getCustomFields();
                customFields.value = fieldsData.data.datas;
                
                const sectionData = await AuditService.getSection(auditId.value, sectionId.value);
                Object.assign(section, sectionData.data.datas);
                
                await nextTick();
                Utils.syncEditors(proxy.$refs);
                sectionOrig.value = cloneDeep(section);
                console.log(section.customFields)
            } catch (err) {
                console.log(err);
            }
        };

        const updateSection = async () => {
            Utils.syncEditors(proxy.$refs);
            await nextTick();
            
            if (proxy.$refs.customfields?.requiredFieldsEmpty()) {
                Notify.create({
                    message: t('msg.fieldRequired'),
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
                return;
            }

            try {
                await AuditService.updateSection(auditId.value, sectionId.value, section);
                sectionOrig.value = cloneDeep(section);
                Notify.create({
                    message: t('msg.sectionUpdateOk'),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                });
            } catch (err) {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
            }
        };

        const cancelEditComment = (comment) => {
            proxy.$parent.editComment = null;
            if (comment._id === 42) {
                proxy.$parent.audit.comments.pop();
                fieldHighlighted.value = "";
            }
        };

        const deleteComment = (comment) => {
            AuditService.deleteComment(auditId.value, comment._id)
            .then(() => {
                if (proxy.$parent.focusedComment === comment._id)
                    fieldHighlighted.value = "";
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
            });
        };

        const updateComment = (comment) => {
            if (comment.textTemp)
                comment.text = comment.textTemp;
            if (comment.replyTemp) {
                comment.replies.push({
                    author: UserService.user.id,
                    text: comment.replyTemp
                });
            }
            if (comment._id === 42) {
                AuditService.createComment(auditId.value, comment)
                .then((res) => {
                    let newComment = res.data.datas;
                    proxy.$parent.editComment = null;
                    proxy.$parent.focusedComment = newComment._id;
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    });
                });
            }
            else {
                AuditService.updateComment(auditId.value, comment)
                .then(() => {
                    proxy.$parent.editComment = null;
                    proxy.$parent.editReply = null;
                })
                .catch((err) => {
                    Notify.create({
                        message: err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    });
                });
            }
        };

        const removeReplyFromComment = (reply, comment) => {
            comment.replies = comment.replies.filter(e => e._id !== reply._id);
            updateComment(comment);
        };

        const displayComment = (comment) => {
            let response = true;
            if ((proxy.$parent.commentsFilter === 'active' && comment.resolved) || 
                (proxy.$parent.commentsFilter === 'resolved' && !comment.resolved))
                response = false;
            return response;
        };

        const numberOfFilteredComments = () => {
            let count = proxy.$parent.$parent.audit.comments.length;
            if (proxy.$parent.$parent.commentsFilter === 'active')
                count = proxy.$parent.$parent.audit.comments.filter(e => !e.resolved).length;
            else if (proxy.$parent.commentsFilter === 'resolved')
                count = proxy.$parent.$parent.audit.comments.filter(e => e.resolved).length;
            
            if (count === 1)
                return `${count} ${t('item')}`;
            else
                return `${count} ${t('items')}`;
        };

        const toggleCommentView = () => {
            Utils.syncEditors(proxy.$refs);
            proxy.$parent.$parent.commentMode = !proxy.$parent.$parent.commentMode;
            if (proxy.$parent.$parent.commentMode) {
                proxy.$parent.$parent.commentSplitRatio = 80;
                proxy.$parent.$parent.commentSplitLimits = [80, 80];
            } else {
                proxy.$parent.$parent.commentSplitRatio = 100;
                proxy.$parent.$parent.commentSplitLimits = [100, 100];
            }
        };

        const focusComment = (comment) => {
            if (
                (!!proxy.$parent.editComment && proxy.$parent.editComment !== comment._id) ||
                (proxy.$parent.replyingComment && !comment.replyTemp) ||
                (proxy.$parent.focusedComment === comment._id)
            )
                return;

            if (comment.findingId && proxy.findingId !== comment.findingId) {
                router.replace({
                    name: 'editFinding',
                    params: {
                        auditId: auditId.value,
                        findingId: comment.findingId,
                        comment: comment
                    }
                });
                return;
            }

            if (comment.sectionId && sectionId.value !== comment.sectionId) {
                router.replace({
                    name: 'editSection',
                    params: {
                        auditId: auditId.value,
                        sectionId: comment.sectionId,
                        comment: comment
                    }
                });
                return;
            }

            let checkCount = 0;
            const intervalId = setInterval(() => {
                checkCount++;
                if (document.getElementById(comment.fieldName)) {
                    clearInterval(intervalId);
                    nextTick(() => {
                        document.getElementById(comment.fieldName).scrollIntoView({ block: "center" });
                    });
                }
                else if (checkCount >= 10) {
                    clearInterval(intervalId);
                }
            }, 100);

            fieldHighlighted.value = comment.fieldName;
            proxy.$parent.focusedComment = comment._id;
        };

        const createComment = (fieldName) => {
            let comment = {
                _id: 42,
                sectionId: sectionId.value,
                fieldName: fieldName,
                authorId: UserService.user.id,
                author: {
                    firstname: UserService.user.firstname,
                    lastname: UserService.user.lastname
                },
                text: ""
            };
            if (proxy.$parent.editComment === 42) {
                proxy.$parent.focusedComment = null;
                proxy.$parent.audit.comments.pop();
            }
            fieldHighlighted.value = fieldName;
            proxy.$parent.audit.comments.push(comment);
            proxy.$parent.editComment = 42;
            focusComment(comment);
        };

        const unsavedChanges = () => {
            return !isEqual(section.customFields, sectionOrig.value.customFields);
        };

        const displayHighlightWarning = () => {
            if (!proxy.$settings.report.enabled || !proxy.$settings.report.public.highlightWarning)
                return null;

            const matchString = `(<mark data-color="${proxy.$settings.report.public.highlightWarningColor}".+?>.+?)</mark>`;
            const regex = new RegExp(matchString);

            if (section.customFields && section.customFields.length > 0) {
                for (let field of section.customFields) {
                    if (field.customField && field.text && field.customField.fieldType === "text") {
                        const result = regex.exec(field.text);
                        if (result && result[1])
                            return (result[1].length > 119) ? 
                                `<b>${field.customField.label}</b><br/>${result[1].substring(0,119)}...` : 
                                `<b>${field.customField.label}</b><br/>${result[1]}`;
                    }
                }
            }
            return null;
        };

        // Lifecycle hooks
        onMounted(() => {
            auditId.value = route.params.auditId;
            sectionId.value = route.params.sectionId;
            getSection();

            socket.emit('menu', { menu: 'editSection', section: sectionId.value, room: auditId.value });
            document.addEventListener('keydown', _listener, false);

            proxy.$parent.focusedComment = null;
            if (route.params.comment)
                focusComment(route.params.comment);
        });

        onBeforeUnmount(() => {
            document.removeEventListener('keydown', _listener, false);
        });

        // Navigation guards
        const beforeRouteLeave = async (to, from, next) => {
            Utils.syncEditors(proxy.$refs);
            const warning = displayHighlightWarning();

            if (unsavedChanges()) {
                Dialog.create({
                    title: t('msg.thereAreUnsavedChanges'),
                    message: t('msg.doYouWantToLeave'),
                    ok: { label: t('btn.confirm'), color: 'negative' },
                    cancel: { label: t('btn.cancel'), color: 'white' },
                    focus: 'cancel'
                })
                .onOk(() => next());
            }
            else if (warning) {
                Dialog.create({
                    title: t('msg.highlightWarningTitle'),
                    message: `${warning}</mark>`,
                    html: true,
                    ok: { label: t('btn.leave'), color: 'negative' },
                    cancel: { label: t('btn.stay'), color: 'white' },
                })
                .onOk(() => next());
            }
            else
                next();
        };

        return {
            auditId,
            t,
            audit,
            sectionId,
            section,
            sectionOrig,
            customFields,
            fieldHighlighted,
            commentTemp,
            replyTemp,
            hoverReply,
            commentDateOptions,
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE,
            getSection,
            updateSection,
            toggleCommentView,
            focusComment,
            createComment,
            cancelEditComment,
            deleteComment,
            updateComment,
            removeReplyFromComment,
            displayComment,
            numberOfFilteredComments,
            unsavedChanges,
            displayHighlightWarning,
            beforeRouteLeave
        };
    }
};

