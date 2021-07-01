var buyAEvt = function(val) {
    $('#buyB').find('option').each(function(){
        $(this).prop('hidden', false);
    });

    if (val == 'PRICE') {
        $('#buyB').find('option').each(function(){
            if ($(this).val() != 'CONST')
                $(this).prop('hidden', true);
        });
        $('#buyB').val('CONST').change();
    } 
    else {
        $('#buyB').find('option').each(function(){
            if ($(this).val() == val)
                $(this).prop('hidden', true);
        });
        if ($('#buyB').val() == val)
            $('#buyB').val('').change();
    }
}

var buyBEvt = function(val) {
    if (val == 'CONST') {
        $('#buyBValue').prop('hidden', false);
    }
    else {
        $('#buyBValue').prop('hidden', true);
        $('#buyBValue').val('');
    }
}

var buyCondAdd = function() {
    let buyA = $('#buyA').val();
    let buyEQ = $('#buyEQ').val();
    let buyB = $('#buyB').val();
    let buyC = $('#buyC').val();
    let buyBValue = $('#buyBValue').val();
    let errMsg = '';
    //console.log(buyA + ',' + buyEQ + ',' + buyB + ',' + buyBValue + ',' + buyC);

    let legal = true;
    if (buyA == '' || buyEQ == '' || buyB == '') {
        legal = false;
        errMsg = '參數不能為空';
    }
    else if (buyA != 'PRICE') {
        if (parseInt(buyBValue) < 0 || parseInt(buyBValue) > 100) {
            legal = false;
            errMsg = '定值範圍只能是介於 0 ~ 100';
        }
    }
    else if (buyB == 'CONST') {
        if (buyBValue.length == 0)
            legal = false;
        if (parseFloat(buyBValue) < 0.0)
            legal = false;
        errMsg = '定值輸入錯誤, 不能為空或是負值';
    }

    if (!legal) {
        alert(errMsg);
        return;
    }

    buyAlgo.push({
        A: {type: buyA},
        E: buyEQ,
        B: {type: buyB, value: buyBValue},
        C: parseInt(buyC)
    });
    //console.log(buyAlgo);
    updateBuyCond();
}

var updateBuyCond = function() {
    if (buyAlgo == undefined)
        return;

    let cond = '';
    let html = '';
    for (let i=0 ; i<buyAlgo.length ; i++) {
        item = buyAlgo[i];
        //console.log(item);
        html += '<tr><td>\n';
        html += (i + 1);
        html += '</td><td>\n';

        let cond = '';
        if (item.A.type == 'PRICE')
            cond += '股價'
        else
            cond += item.A.type;

        cond += ' ' + item.E + ' ';
        if (item.B.type == 'CONST')
            cond += item.B.value;
        else
            cond += item.B.type;
        html += cond;

        html += ',連續' + item.C + '天';

        html += '</td><td>\n';
        html += '<img class="Image pt-0 pb-0" '
              + 'src="../images/del.png" width="26" height="26" '
              + 'onClick="delBuyCond(' + i + ')">\n';
        html += '</td></tr>\n';

    }
    $('#buyCondList').html(html);
}

var delBuyCond = function(index) {
    buyAlgo.splice(index, 1);
    updateBuyCond();
}

var regBuyEvent = function() {
    $('#buyA').on('change', function(){
        buyAEvt($(this).val());
    });

    $('#buyB').on('change', function(){
        buyBEvt($(this).val());
    });

    $('#buyCondAdd').on('click', function(){
        buyCondAdd();
    });
}
